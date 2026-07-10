import { SlackAPI } from "./src/api";
import type { ISlackAPI } from "./src/api/types";
import { ErrorBoundary, ErrorView, GlobalUnreadBadge, NotificationBanner } from "./src/components";
import {
	ChannelInfoScreen,
	ChannelListScreen,
	ChatScreen,
	LoginScreen,
	ProfileScreen,
	SearchScreen,
	SettingsScreen,
	ThreadScreen
} from "./src/screens";
import type { SearchMatch } from "./src/screens/types";
import {
	startBackgroundNotifications,
	stopBackgroundNotifications,
	syncAccountsToNative,
	syncChannelsMentionOnlyToNative
} from "./src/services/nativeNotification";
import {
	getActiveChannelId,
	popScreen,
	pushScreen,
	replaceTopScreen
} from "./src/services/navigationManager";
import RTMClient from "./src/services/rtmClient";
import { registerRTMHandlers } from "./src/services/rtmHandlers";
import {
	fetchAllUsers,
	fetchTeamIcon,
	loadChannelsWithUnreadDetection,
	updateAccountTeamIcon
} from "./src/services/slackDataLoader";
import { getMode, setFontSizeKey, setMode } from "./src/theme";
import type { FontSizeKey } from "./src/theme";
import type {
	AccountEntry,
	RTMEvent,
	SlackChannel,
	SlackMessage,
	SlackResponse
} from "./src/types";
import type { AppProps as Props, AppState as State, AppStyles as Styles } from "./src/types";
import {
	clearToken,
	getAccounts,
	getActiveAccountId,
	getChannelLabel,
	getChannelsMentionOnly,
	getFontSize,
	getNotifEnabled,
	getNotifInterval,
	getSoundEnabled,
	getTheme,
	getToken,
	getTotalUnread,
	logger,
	playNotification,
	saveAccounts,
	saveActiveAccountId,
	saveChannelsMentionOnly,
	saveFontSize,
	saveNotifEnabled,
	saveNotifInterval,
	saveSoundEnabled,
	saveTheme,
	saveToken,
	setNotificationMuted
} from "./src/utils";
import { errorMessage } from "./src/utils/error";
import React, { Component } from "react";
import {
	ActivityIndicator,
	AppState,
	BackHandler,
	StatusBar,
	StyleSheet,
	View
} from "react-native";
import type { NativeEventSubscription } from "react-native";

const BANNER_TIMEOUT_MS = 4000;

export default class App extends Component<Props, State> {
	_notifPollTimer: ReturnType<typeof setInterval> | null;
	_bannerTimer: ReturnType<typeof setTimeout> | null;
	_loadingChannels: boolean;
	_backHandler: NativeEventSubscription | null;
	_appStateListener: NativeEventSubscription | null;
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
			notifInterval: 120000,
			notifEnabled: true,
			soundEnabled: true,
			channelsMentionOnly: false,
			fontSize: "medium",
			themeMode: "dark",
			accounts: [],
			rtmConnected: false,
			banner: null
		};
		this._notifPollTimer = null;
		this._bannerTimer = null;
		this._loadingChannels = false;
		this._backHandler = null;
		this._appStateListener = null;
		this._rtm = new RTMClient();
		this._rtmChannelHandlers = {};
	}

	componentDidMount(): void {
		this._loadTheme();
		this.tryAutoLogin();
		const self = this;
		this._backHandler = BackHandler.addEventListener("hardwareBackPress", function () {
			if (self.state.stack.length > 1) {
				self.goBack();
				return true;
			}
			return false;
		});
		this._appStateListener = AppState.addEventListener
			? AppState.addEventListener("change", function (state: string) {
					self._handleAppState(state);
				})
			: null;
		if (!this._appStateListener) {
			AppState.addEventListener("change", function (state: string) {
				self._handleAppState(state);
			});
		}
	}

	componentWillUnmount(): void {
		if (this._backHandler) {
			this._backHandler.remove();
		}
		if (this._appStateListener && this._appStateListener.remove) {
			this._appStateListener.remove();
		}
		this._stopNotifPolling();
		if (this._bannerTimer) clearTimeout(this._bannerTimer);
		this._rtm.disconnect();
	}

	async tryAutoLogin(): Promise<void> {
		try {
			const accounts = await getAccounts();
			if (accounts.length > 0) {
				this.setState({ accounts: accounts });
				const activeId = await getActiveAccountId();
				const active = activeId
					? accounts.find(function (a: AccountEntry) {
							return a.userId === activeId;
						})
					: accounts[0];
				if (active) {
					await this.doLogin(active.token);
				} else {
					await this.doLogin(accounts[0].token);
				}
			} else {
				const token = await getToken();
				if (token) {
					await this.doLogin(token);
				} else {
					this.setState({ initializing: false });
				}
			}
		} catch (err: unknown) {
			logger.warn("App.autoLogin", "auto-login failed, showing login screen", err);
			this.setState({ initializing: false });
		}
	}

	async doLogin(token: string): Promise<void> {
		const slack = new SlackAPI(token);
		let auth: SlackResponse;
		try {
			auth = await slack.authTest();
		} catch (err: unknown) {
			this.setState({ initializing: false });
			throw new Error(errorMessage(err, "Authentication failed"));
		}

		const userId = auth && typeof auth.user_id === "string" ? auth.user_id : "";
		if (!userId) {
			this.setState({ initializing: false });
			throw new Error("Invalid authentication response");
		}

		try {
			await saveToken(token);
		} catch (err: unknown) {
			logger.warn("App.doLogin", "token persistence failed; login continues", err);
		}

		const teamName = typeof auth.team === "string" ? auth.team : "";
		const teamId = typeof auth.team_id === "string" ? auth.team_id : "";
		const userName = typeof auth.user === "string" ? auth.user : "";

		const _self = this;
		const accounts = this.state.accounts.slice();
		const existingIdx = accounts.findIndex(function (a: AccountEntry) {
			return a.userId === userId;
		});
		const accountEntry: AccountEntry = {
			token: token,
			teamName: teamName,
			teamId: teamId,
			userId: userId,
			userName: userName,
			teamIcon: ""
		};
		if (existingIdx >= 0) {
			accounts[existingIdx] = Object.assign({}, accounts[existingIdx], accountEntry);
		} else {
			accounts.push(accountEntry);
		}

		try {
			await saveAccounts(accounts);
			await saveActiveAccountId(userId);
		} catch (err: unknown) {
			logger.warn("App.doLogin", "failed to persist account list", err);
		}

		this.setState({
			slack: slack,
			currentUser: userId,
			teamName: teamName,
			stack: [{ screen: "channelList", params: {} }],
			initializing: false,
			accounts: accounts
		});

		this._loadUsers(slack);
		this._loadChannels(slack);
		this._loadTeamInfo(slack);
		this._loadNotifSettings();
		this._connectRTM(slack);
		syncAccountsToNative(accounts);
	}

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
				this._getCurrentChannelId()
			);
			if (result.changed) {
				this.setState({
					channels: result.channels,
					channelsLoading: false,
					channelsError: null
				});
			} else if (isFirstLoad) {
				this.setState({ channelsLoading: false, channelsError: null });
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

	async handleLogout(): Promise<void> {
		this._rtm.disconnect();
		this._rtmChannelHandlers = {};
		this._stopNotifPolling();
		const currentUserId = this.state.currentUser;
		const accounts = this.state.accounts.filter(function (a: AccountEntry) {
			return a.userId !== currentUserId;
		});
		syncAccountsToNative(accounts);
		try {
			await saveAccounts(accounts);
		} catch (err: unknown) {
			logger.warn("App.handleLogout", "failed to persist accounts after logout", err);
		}

		if (accounts.length > 0) {
			this.setState({ accounts: accounts });
			try {
				await this.switchAccount(accounts[0]);
			} catch (err: unknown) {
				logger.warn("App.handleLogout", "switching to fallback account failed", err);
				await clearToken();
				this.setState({
					slack: null,
					currentUser: null,
					teamName: "",
					teamIcon: "",
					usersMap: {},
					channels: [],
					accounts: accounts,
					stack: [{ screen: "login", params: {} }]
				});
			}
		} else {
			await clearToken();
			this.setState({
				slack: null,
				currentUser: null,
				teamName: "",
				teamIcon: "",
				usersMap: {},
				channels: [],
				accounts: [],
				stack: [{ screen: "login", params: {} }]
			});
		}
	}

	async switchAccount(account: AccountEntry): Promise<void> {
		this._rtm.disconnect();
		this._rtmChannelHandlers = {};
		this._stopNotifPolling();
		this.setState({
			slack: null,
			currentUser: null,
			teamName: "",
			teamIcon: "",
			usersMap: {},
			channels: [],
			channelsLoading: false,
			initializing: true
		});
		await this.doLogin(account.token);
	}

	handleAddAccount(): void {
		this.navigate("login", { addingAccount: true });
	}

	async handleRemoveAccount(account: AccountEntry): Promise<void> {
		const accounts = this.state.accounts.filter(function (a: AccountEntry) {
			return a.userId !== account.userId;
		});
		try {
			await saveAccounts(accounts);
		} catch (err: unknown) {
			logger.warn("App.handleRemoveAccount", "failed to persist accounts", err);
		}
		this.setState({ accounts: accounts });
	}

	_handleAppState(state: string): void {
		if (state === "active") {
			if (this.state.notifEnabled) this._startNotifPolling();
			if (this.state.slack) this._connectRTM(this.state.slack);
		} else if (state === "background") {
			this._stopNotifPolling();
			this._rtm.disconnect();
		}
		// Native background polling is now driven by setAccounts +
		// the notification toggle, not by AppState. That way swipe-killing
		// the app from recents (no background event delivered) still leaves
		// the alarm armed.
	}

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
				self._startNotifPolling();
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
	// isn't viewing. OS notifications are suppressed while the app is in the
	// foreground, so this is how foreground messages reach the user.
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
		const banner = {
			channelId: channelId,
			title: getChannelLabel(channel, this.state.usersMap),
			body: text.length > 0 ? text : "New message"
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

	async _loadTheme(): Promise<void> {
		try {
			const mode = await getTheme();
			setMode(mode);
			this.setState({ themeMode: mode });
		} catch (err: unknown) {
			logger.warn("App.loadTheme", "failed to load theme, using default", err);
		}
	}

	_toggleTheme(): void {
		const newMode = getMode() === "dark" ? "light" : "dark";
		setMode(newMode);
		this.setState({ themeMode: newMode });
		saveTheme(newMode);
	}

	async _loadNotifSettings(): Promise<void> {
		try {
			const interval = await getNotifInterval();
			const enabled = await getNotifEnabled();
			const sound = await getSoundEnabled();
			const isMentionOnly = await getChannelsMentionOnly();
			const font = await getFontSize();
			setNotificationMuted(!sound);
			setFontSizeKey(font);
			// The native poll service reads this from its own prefs; re-sync on
			// every startup so it survives reinstalls.
			syncChannelsMentionOnlyToNative(isMentionOnly);
			this.setState(
				{
					notifInterval: interval,
					notifEnabled: enabled,
					soundEnabled: sound,
					channelsMentionOnly: isMentionOnly,
					fontSize: font
				},
				function (this: App) {
					if (enabled) {
						this._startNotifPolling();
					} else {
						// User has notifications disabled in settings — cancel the alarm
						// that setAccounts auto-armed during login.
						stopBackgroundNotifications();
					}
				}.bind(this)
			);
		} catch (err: unknown) {
			logger.warn(
				"App.loadNotifSettings",
				"failed to load notification settings, using defaults",
				err
			);
			this._startNotifPolling();
		}
	}

	async _handleToggleNotif(): Promise<void> {
		const enabled = !this.state.notifEnabled;
		await saveNotifEnabled(enabled);
		this.setState({ notifEnabled: enabled });
		if (enabled) {
			this._startNotifPolling();
			if (this.state.accounts.length > 0) startBackgroundNotifications();
		} else {
			this._stopNotifPolling();
			stopBackgroundNotifications();
		}
	}

	async _handleChangeInterval(ms: number): Promise<void> {
		await saveNotifInterval(ms);
		this.setState({ notifInterval: ms });
		this._startNotifPolling();
	}

	async _handleToggleSound(): Promise<void> {
		const enabled = !this.state.soundEnabled;
		await saveSoundEnabled(enabled);
		setNotificationMuted(!enabled);
		this.setState({ soundEnabled: enabled });
	}

	async _handleToggleChannelsMentionOnly(): Promise<void> {
		const enabled = !this.state.channelsMentionOnly;
		await saveChannelsMentionOnly(enabled);
		syncChannelsMentionOnlyToNative(enabled);
		this.setState({ channelsMentionOnly: enabled });
	}

	async _handleChangeFontSize(size: string): Promise<void> {
		await saveFontSize(size as FontSizeKey);
		setFontSizeKey(size as FontSizeKey);
		this.setState({ fontSize: size });
	}

	_startNotifPolling(): void {
		this._stopNotifPolling();
		if (!this.state.notifEnabled) return;
		const self = this;
		const baseInterval = this.state.notifInterval || 120000;
		const interval = this.state.rtmConnected ? 300000 : baseInterval;
		this._notifPollTimer = setInterval(function () {
			if (self.state.slack) self._loadChannels(self.state.slack);
		}, interval);
	}

	_stopNotifPolling(): void {
		if (this._notifPollTimer) {
			clearInterval(this._notifPollTimer);
			this._notifPollTimer = null;
		}
	}

	_getCurrentChannelId(): string | null {
		return getActiveChannelId(this.state.stack);
	}

	navigate(screen: string, params?: Record<string, any>): void {
		this.setState(function (prev: State) {
			return { stack: pushScreen(prev.stack, screen, params) };
		});
	}

	goBack(): void {
		this.setState(function (prev: State) {
			const newStack = popScreen(prev.stack);
			if (!newStack) return null;
			return { stack: newStack };
		});
	}

	replaceTop(screen: string, params?: Record<string, any>): void {
		this.setState(function (prev: State) {
			return { stack: replaceTopScreen(prev.stack, screen, params) };
		});
	}

	renderScreen(): React.ReactElement | null {
		const { stack, slack, currentUser, usersMap, channels, channelsLoading, teamName, teamIcon } =
			this.state;
		const current = stack[stack.length - 1];
		const screen = current.screen;
		const params = current.params || {};
		const self = this;

		switch (screen) {
			case "login":
				return (
					<LoginScreen
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

	render(): React.ReactElement {
		if (this.state.initializing) {
			return (
				<View style={styles.splash}>
					<ActivityIndicator
						size="large"
						color="#1264A3"
					/>
				</View>
			);
		}

		const { stack, channels, banner } = this.state;
		const currentScreen = stack[stack.length - 1].screen;
		const totalUnread = getTotalUnread(channels);
		// The channel list already shows its own unread badges; the floating
		// indicator is only useful on the other screens.
		const shouldShowBadge = currentScreen !== "channelList" && currentScreen !== "login";
		const self = this;

		return (
			<View style={styles.app}>
				<StatusBar
					backgroundColor="#19171D"
					barStyle="light-content"
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

const styles = StyleSheet.create<Styles>({
	app: {
		flex: 1,
		backgroundColor: "#1A1D21"
	},
	splash: {
		flex: 1,
		backgroundColor: "#1A1D21",
		justifyContent: "center",
		alignItems: "center"
	}
});
