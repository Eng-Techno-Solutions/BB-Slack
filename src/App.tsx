import { styles } from "./App.styles";
import { SlackAPI } from "./api";
import type { ISlackAPI } from "./api/types";
import { ErrorBoundary, ErrorView, GlobalUnreadBadge, NotificationBanner } from "./components";
import {
	ChannelInfoScreen,
	ChannelListScreen,
	ChatScreen,
	LoginScreen,
	ProfileScreen,
	SearchScreen,
	SettingsScreen,
	ThreadScreen
} from "./screens";
import type { SearchMatch } from "./screens/types";
import {
	getResetState,
	performAuth,
	persistAccountLogin,
	removeAccount,
	tryAutoLogin as resolveAutoLogin,
	upsertAccount
} from "./services/accountManager";
import RTMClient from "./services/rtmClient";
import { registerRTMHandlers } from "./services/rtmHandlers";
import {
	loadAllSettings,
	loadThemeMode,
	persistChannelsMentionOnly,
	persistFontSize,
	persistNotifEnabled,
	persistNotifInterval,
	persistSoundEnabled,
	toggleThemeMode
} from "./services/settingsManager";
import {
	fetchAllUsers,
	fetchTeamIcon,
	loadChannelsWithUnreadDetection,
	updateAccountTeamIcon
} from "./services/slackDataLoader";
import { getColors } from "./theme";
import type { AccountEntry, RTMEvent, SlackChannel, SlackMessage } from "./types";
import type { AppProps as Props, AppState as State } from "./types";
import {
	clearToken,
	getChannelLabel,
	getTotalUnread,
	getUserName,
	logger,
	playNotification
} from "./utils";
import { errorMessage } from "./utils/error";
import React, { Component } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";

const BANNER_TIMEOUT_MS = 4000;

export default class App extends Component<Props, State> {
	_channelPollTimer: ReturnType<typeof setInterval> | null;
	_bannerTimer: ReturnType<typeof setTimeout> | null;
	_loadingChannels: boolean;
	_rtm: RTMClient;
	_rtmChannelHandlers: Record<string, () => void>;

	constructor(props: Props) {
		super(props);
		this.state = {
			initializing: true,
			slack: null,
			currentUser: null,
			teamName: "",
			teamIcon: "",
			usersMap: {},
			channels: [],
			channelsLoading: false,
			channelsError: null,
			stack: [{ screen: "login", params: {} }],
			themeMode: "dark",
			notifInterval: 120000,
			notifEnabled: true,
			soundEnabled: true,
			channelsMentionOnly: false,
			fontSize: "medium",
			accounts: [],
			rtmConnected: false,
			banner: null
		};
		this._channelPollTimer = null;
		this._bannerTimer = null;
		this._loadingChannels = false;
		this._rtm = new RTMClient();
		this._rtmChannelHandlers = {};
	}

	componentDidMount(): void {
		this._initTheme();
		this._initSettings();
		this.tryAutoLogin();
	}

	componentWillUnmount(): void {
		this.stopChannelPolling();
		if (this._bannerTimer) clearTimeout(this._bannerTimer);
		this._rtm.disconnect();
	}

	// ── Theme ──────────────────────────────────────────────

	async _initTheme(): Promise<void> {
		try {
			const mode = await loadThemeMode();
			this.setState({ themeMode: mode });
			this._applyThemeToDOM(mode);
		} catch (err: unknown) {
			logger.warn("App.initTheme", "failed to load theme, using default", err);
		}
	}

	_applyThemeToDOM(mode: string): void {
		try {
			document.documentElement.setAttribute("data-theme", mode);
		} catch (_err) {
			// Non-web platforms have no `document`; intentional no-op.
		}
	}

	_toggleTheme(): void {
		const newMode = toggleThemeMode();
		this.setState({ themeMode: newMode });
		this._applyThemeToDOM(newMode);
	}

	// ── Settings ───────────────────────────────────────────

	async _initSettings(): Promise<void> {
		try {
			const settings = await loadAllSettings();
			const self = this;
			this.setState(settings, function () {
				if (settings.notifEnabled && self.state.slack) {
					self.startChannelPolling(self.state.slack);
				}
			});
		} catch (err: unknown) {
			logger.warn("App.initSettings", "failed to load settings, using defaults", err);
		}
	}

	async _handleToggleNotif(): Promise<void> {
		const enabled = !this.state.notifEnabled;
		await persistNotifEnabled(enabled);
		this.setState({ notifEnabled: enabled });
		if (enabled) {
			this.startChannelPolling(this.state.slack);
		} else {
			this.stopChannelPolling();
		}
	}

	async _handleChangeInterval(ms: number): Promise<void> {
		await persistNotifInterval(ms);
		this.setState({ notifInterval: ms });
		if (this.state.notifEnabled && this.state.slack) {
			this.stopChannelPolling();
			this.startChannelPolling(this.state.slack);
		}
	}

	async _handleToggleSound(): Promise<void> {
		const enabled = !this.state.soundEnabled;
		await persistSoundEnabled(enabled);
		this.setState({ soundEnabled: enabled });
	}

	async _handleToggleChannelsMentionOnly(): Promise<void> {
		const enabled = !this.state.channelsMentionOnly;
		await persistChannelsMentionOnly(enabled);
		this.setState({ channelsMentionOnly: enabled });
	}

	async _handleChangeFontSize(size: string): Promise<void> {
		await persistFontSize(size);
		this.setState({ fontSize: size });
	}

	// ── Auth & Accounts ────────────────────────────────────

	async tryAutoLogin(): Promise<void> {
		try {
			const result = await resolveAutoLogin();
			if (result.accounts.length > 0) {
				this.setState({ accounts: result.accounts });
			}
			if (result.token) {
				await this.doLogin(result.token);
			} else {
				this.setState({ initializing: false });
			}
		} catch (err: unknown) {
			logger.warn("App.autoLogin", "auto-login failed, showing login screen", err);
			this.setState({ initializing: false });
		}
	}

	async doLogin(token: string): Promise<void> {
		const slack = new SlackAPI(token);
		let auth;
		try {
			auth = await performAuth(slack, token);
		} catch (err: unknown) {
			this.setState({ initializing: false });
			throw new Error(errorMessage(err, "Authentication failed"));
		}

		const accounts = upsertAccount(this.state.accounts, auth, token);
		await persistAccountLogin(accounts, auth.user_id);

		this.setState({
			slack: slack,
			currentUser: auth.user_id,
			teamName: auth.team || "",
			stack: [{ screen: "channelList", params: {} }],
			initializing: false,
			accounts: accounts
		});

		this._loadTeamInfo(slack);
		this._loadUsers(slack);
		this._loadChannels(slack);
		this.startChannelPolling(slack);
		this._connectRTM(slack);
	}

	async handleLogout(): Promise<void> {
		this._rtm.disconnect();
		this._rtmChannelHandlers = {};
		this.stopChannelPolling();
		const accounts = await removeAccount(this.state.accounts, this.state.currentUser || "");

		if (accounts.length > 0) {
			this.setState({ accounts: accounts });
			try {
				await this.switchAccount(accounts[0]);
			} catch (err: unknown) {
				logger.warn("App.handleLogout", "switching to fallback account failed", err);
				await clearToken();
				this.setState(Object.assign({}, getResetState(), { accounts: accounts }));
			}
		} else {
			await clearToken();
			this.setState(Object.assign({}, getResetState(), { accounts: [] }));
		}
	}

	async switchAccount(account: AccountEntry): Promise<void> {
		this._rtm.disconnect();
		this._rtmChannelHandlers = {};
		this.stopChannelPolling();
		this.setState(Object.assign({}, getResetState(), { initializing: true }));
		await this.doLogin(account.token);
	}

	handleAddAccount(): void {
		this.navigate("login", { addingAccount: true });
	}

	async handleRemoveAccount(account: AccountEntry): Promise<void> {
		const accounts = await removeAccount(this.state.accounts, account.userId);
		this.setState({ accounts: accounts });
	}

	// ── Data Loading ───────────────────────────────────────

	async _loadTeamInfo(slack: ISlackAPI): Promise<void> {
		try {
			const icon = await fetchTeamIcon(slack);
			this.setState({ teamIcon: icon });
			const updated = await updateAccountTeamIcon(
				this.state.accounts,
				this.state.currentUser || "",
				icon
			);
			if (updated !== this.state.accounts) {
				this.setState({ accounts: updated });
			}
		} catch (err: unknown) {
			logger.warn("App.loadTeamInfo", "failed to fetch team icon", err);
		}
	}

	async _loadUsers(slack: ISlackAPI): Promise<void> {
		try {
			const usersMap = await fetchAllUsers(slack);
			this.setState({ usersMap: usersMap });
		} catch (err: unknown) {
			logger.warn("App.loadUsers", "failed to load users directory", err);
		}
	}

	async _loadChannels(slack: ISlackAPI): Promise<void> {
		if (this._loadingChannels) return;
		this._loadingChannels = true;
		const isFirstLoad = this.state.channels.length === 0;
		if (isFirstLoad) this.setState({ channelsLoading: true });
		try {
			const result = await loadChannelsWithUnreadDetection(
				slack,
				this.state.channels,
				this._getActiveChannelId()
			);
			if (result.changed) {
				this.setState({
					channels: result.channels,
					channelsLoading: false,
					channelsError: null
				});
			} else if (this.state.channelsError) {
				this.setState({ channelsError: null });
			}
		} catch (err: unknown) {
			const msg = errorMessage(err, "unknown");
			if (msg === "ratelimited") {
				logger.warn("App.loadChannels", "rate limited, backing off");
			} else {
				logger.warn("App.loadChannels", "load failed", err);
			}
			this.setState({
				channelsLoading: false,
				channelsError: isFirstLoad ? msg : this.state.channelsError
			});
		}
		this._loadingChannels = false;
	}

	_retryLoadChannels = (): void => {
		if (!this.state.slack) return;
		this.setState({ channelsError: null });
		this._loadChannels(this.state.slack);
	};

	// ── RTM ───────────────────────────────────────────────

	_connectRTM(slack: ISlackAPI): void {
		if (this._rtm.isConnected()) return;
		const self = this;
		registerRTMHandlers({
			rtm: this._rtm,
			handlers: this._rtmChannelHandlers,
			currentUserId: function () {
				return self.state.currentUser;
			},
			onChannelsChanged: function () {
				self._loadChannels(slack);
			},
			onStatusChanged: function (connected: boolean) {
				self.setState({ rtmConnected: connected });
				self.startChannelPolling(slack);
			},
			onIncomingMessage: function (event: RTMEvent) {
				self._handleIncomingMessage(event);
			}
		});
		this._rtm.connect(slack);
	}

	_registerRTMHandler(channelId: string, handler: () => void): void {
		this._rtmChannelHandlers[channelId] = handler;
	}

	_unregisterRTMHandler(channelId: string): void {
		delete this._rtmChannelHandlers[channelId];
	}

	// Surfaces an in-app banner for a message arriving in a channel the user
	// isn't viewing (the foreground equivalent of an OS notification).
	_handleIncomingMessage(event: RTMEvent): void {
		if (!this.state.notifEnabled) {
			logger.info("App.banner", "skipped: notifications disabled");
			return;
		}
		const channelId = event.channel;
		if (!channelId) return;
		const channel = this.state.channels.find(function (ch: SlackChannel) {
			return ch.id === channelId;
		});
		if (!channel) {
			logger.info("App.banner", "skipped: channel " + channelId + " not in loaded list");
			return;
		}
		logger.info("App.banner", "showing banner for " + channelId);

		const text = (event.text || "").trim();
		const body = text.length > 0 ? text : "New message";
		// DM banners already carry the sender's name as the title; for channels
		// and group DMs, prefix the sender so the user knows who wrote it.
		const senderName =
			!channel.is_im && event.user ? getUserName(event.user, this.state.usersMap) : "";
		const banner = {
			channelId: channelId,
			title: getChannelLabel(channel, this.state.usersMap),
			body: senderName ? senderName + ": " + body : body
		};
		this.setState({ banner: banner });
		playNotification();

		if (this._bannerTimer) clearTimeout(this._bannerTimer);
		const self = this;
		this._bannerTimer = setTimeout(function () {
			self._dismissBanner();
		}, BANNER_TIMEOUT_MS);
	}

	_dismissBanner(): void {
		if (this._bannerTimer) {
			clearTimeout(this._bannerTimer);
			this._bannerTimer = null;
		}
		if (this.state.banner) this.setState({ banner: null });
	}

	_openBanner(): void {
		const banner = this.state.banner;
		if (!banner) return;
		const channel = this.state.channels.find(function (ch: SlackChannel) {
			return ch.id === banner.channelId;
		});
		this._dismissBanner();
		if (channel) this.navigate("chat", { channel: channel });
	}

	// ── Channel Polling ────────────────────────────────────

	startChannelPolling(slack: ISlackAPI): void {
		this.stopChannelPolling();
		if (!this.state.notifEnabled) return;
		const self = this;
		const baseInterval = this.state.notifInterval || 120000;
		const interval = this.state.rtmConnected ? 300000 : baseInterval;
		this._channelPollTimer = setInterval(function () {
			self._loadChannels(slack);
		}, interval);
	}

	stopChannelPolling(): void {
		if (this._channelPollTimer) {
			clearInterval(this._channelPollTimer);
			this._channelPollTimer = null;
		}
	}

	_getActiveChannelId(): string | null {
		const stack = this.state.stack;
		const current = stack[stack.length - 1];
		if (current.screen === "chat" && current.params && current.params.channel) {
			return current.params.channel.id;
		}
		return null;
	}

	// ── Navigation ─────────────────────────────────────────

	navigate(screen: string, params?: Record<string, any>): void {
		this.setState(function (prev: State) {
			return {
				stack: prev.stack.concat([{ screen: screen, params: params || {} }])
			};
		});
	}

	goBack(): void {
		this.setState(function (prev: State) {
			if (prev.stack.length <= 1) return null;
			return { stack: prev.stack.slice(0, -1) };
		});
	}

	replaceTop(screen: string, params?: Record<string, any>): void {
		this.setState(function (prev: State) {
			const newStack = prev.stack.slice(0, -1);
			newStack.push({ screen: screen, params: params || {} });
			return { stack: newStack };
		});
	}

	// ── Screen Rendering ───────────────────────────────────

	renderScreen(): React.ReactElement | null {
		const {
			stack,
			slack,
			currentUser,
			usersMap,
			channels,
			channelsLoading,
			teamName,
			teamIcon,
			themeMode
		} = this.state;
		const current = stack[stack.length - 1];
		const screen = current.screen;
		const params = current.params || {};
		const self = this;

		switch (screen) {
			case "login":
				return (
					<LoginScreen
						themeMode={themeMode}
						onLogin={function (token: string) {
							return self.doLogin(token);
						}}
						onBack={
							params.addingAccount
								? function () {
										self.goBack();
									}
								: null
						}
					/>
				);

			case "channelList":
				if (channels.length === 0 && this.state.channelsError && !channelsLoading) {
					return (
						<ErrorView
							title="Couldn't load channels"
							message={
								this.state.channelsError === "ratelimited"
									? "Slack rate-limited the request. Try again in a moment."
									: "Check your connection and try again."
							}
							onRetry={this._retryLoadChannels}
						/>
					);
				}
				return (
					<ChannelListScreen
						themeMode={themeMode}
						slack={slack}
						channels={channels}
						usersMap={usersMap}
						currentUserId={currentUser || ""}
						loading={channelsLoading}
						teamName={teamName}
						teamIcon={teamIcon}
						accounts={this.state.accounts}
						activeAccountId={currentUser}
						onSelect={function (ch: SlackChannel) {
							self.navigate("chat", { channel: ch });
						}}
						onSearch={function () {
							self.navigate("search");
						}}
						onLogout={function () {
							self.handleLogout();
						}}
						onSettings={function () {
							self.navigate("settings");
						}}
						onSwitchAccount={function (account: AccountEntry) {
							self.switchAccount(account);
						}}
						onAddAccount={function () {
							self.handleAddAccount();
						}}
						onRemoveAccount={function (account: AccountEntry) {
							self.handleRemoveAccount(account);
						}}
					/>
				);

			case "chat":
				if (!params.channel) {
					self.goBack();
					return null;
				}
				return (
					<ChatScreen
						key={params.channel.id}
						themeMode={themeMode}
						slack={slack}
						channel={params.channel}
						usersMap={usersMap}
						currentUserId={currentUser || ""}
						rtmConnected={this.state.rtmConnected}
						onRegisterRTMHandler={function (channelId: string, handler: () => void) {
							self._registerRTMHandler(channelId, handler);
						}}
						onUnregisterRTMHandler={function (channelId: string) {
							self._unregisterRTMHandler(channelId);
						}}
						onBack={function () {
							self.goBack();
						}}
						onThread={function (msg: SlackMessage) {
							self.navigate("thread", { channel: params.channel, parentMessage: msg });
						}}
						onMembers={function () {
							self.navigate("channelInfo", { channel: params.channel });
						}}
					/>
				);

			case "thread":
				if (!params.parentMessage || !params.channel) {
					self.goBack();
					return null;
				}
				return (
					<ThreadScreen
						key={params.parentMessage.ts}
						themeMode={themeMode}
						slack={slack}
						channel={params.channel}
						parentMessage={params.parentMessage}
						usersMap={usersMap}
						currentUserId={currentUser || ""}
						rtmConnected={this.state.rtmConnected}
						onRegisterRTMHandler={function (channelId: string, handler: () => void) {
							self._registerRTMHandler(channelId, handler);
						}}
						onUnregisterRTMHandler={function (channelId: string) {
							self._unregisterRTMHandler(channelId);
						}}
						onBack={function () {
							self.goBack();
						}}
					/>
				);

			case "search":
				return (
					<SearchScreen
						themeMode={themeMode}
						slack={slack}
						usersMap={usersMap}
						onBack={function () {
							self.goBack();
						}}
						onSelectMessage={function (msg: SearchMatch) {
							if (msg.channel && msg.channel.id) {
								const ch = channels.find(function (c: SlackChannel) {
									return c.id === msg.channel.id;
								});
								if (ch) {
									self.navigate("chat", { channel: ch });
								}
							}
						}}
					/>
				);

			case "channelInfo":
				return (
					<ChannelInfoScreen
						themeMode={themeMode}
						slack={slack}
						channel={params.channel}
						usersMap={usersMap}
						currentUserId={currentUser || ""}
						onBack={function () {
							self.goBack();
						}}
						onProfile={function (userId: string) {
							self.navigate("profile", { userId: userId, channel: params.channel });
						}}
					/>
				);

			case "settings":
				return (
					<SettingsScreen
						themeMode={themeMode}
						notifEnabled={this.state.notifEnabled}
						notifInterval={this.state.notifInterval}
						soundEnabled={this.state.soundEnabled}
						channelsMentionOnly={this.state.channelsMentionOnly}
						fontSize={this.state.fontSize}
						rtmConnected={this.state.rtmConnected}
						onToggleNotif={function () {
							self._handleToggleNotif();
						}}
						onChangeInterval={function (ms: number) {
							self._handleChangeInterval(ms);
						}}
						onToggleSound={function () {
							self._handleToggleSound();
						}}
						onToggleChannelsMentionOnly={function () {
							self._handleToggleChannelsMentionOnly();
						}}
						onToggleTheme={function () {
							self._toggleTheme();
						}}
						onChangeFontSize={function (s: string) {
							self._handleChangeFontSize(s);
						}}
						onBack={function () {
							self.goBack();
						}}
					/>
				);

			case "profile":
				return (
					<ProfileScreen
						themeMode={themeMode}
						slack={slack}
						userId={params.userId}
						usersMap={usersMap}
						currentUserId={currentUser || ""}
						onBack={function () {
							self.goBack();
						}}
						onOpenDM={function (dmChannel: SlackChannel) {
							self.navigate("chat", { channel: dmChannel });
						}}
					/>
				);

			default:
				return null;
		}
	}

	// ── Render ──────────────────────────────────────────────

	render(): React.ReactElement {
		const colors = getColors();

		if (this.state.initializing) {
			return (
				<View style={[styles.splash, { backgroundColor: colors.bgSplash }]}>
					<ActivityIndicator
						size="large"
						color={colors.splash}
					/>
				</View>
			);
		}

		const { stack, channels, banner } = this.state;
		const currentScreen = stack[stack.length - 1].screen;
		const totalUnread = getTotalUnread(channels);
		const shouldShowBadge = currentScreen !== "channelList" && currentScreen !== "login";
		const self = this;

		return (
			<View style={[styles.app, { backgroundColor: colors.bgSplash }]}>
				<StatusBar
					backgroundColor={colors.statusBar}
					barStyle={colors.statusBarStyle}
				/>
				<ErrorBoundary scope="App.screen">{this.renderScreen()}</ErrorBoundary>
				{shouldShowBadge ? (
					<GlobalUnreadBadge
						count={totalUnread}
						onPress={function () {
							self.navigate("channelList");
						}}
					/>
				) : null}
				{banner ? (
					<NotificationBanner
						title={banner.title}
						body={banner.body}
						onPress={function () {
							self._openBanner();
						}}
						onDismiss={function () {
							self._dismissBanner();
						}}
					/>
				) : null}
			</View>
		);
	}
}
