import { styles } from "./App.styles";
import { SlackAPI } from "./api";
import type { ISlackAPI } from "./api/types";
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
import {
	getResetState,
	performAuth,
	persistAccountLogin,
	removeAccount,
	tryAutoLogin as resolveAutoLogin,
	upsertAccount
} from "./services/accountManager";
import {
	loadAllSettings,
	loadThemeMode,
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
import type { AccountEntry, SlackChannel, SlackMessage } from "./types";
import type { AppProps as Props, AppState as State } from "./types";
import { clearToken } from "./utils";
import React, { Component } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";

export default class App extends Component<Props, State> {
	_channelPollTimer: ReturnType<typeof setInterval> | null;
	_loadingChannels: boolean;

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
			stack: [{ screen: "login", params: {} }],
			themeMode: "dark",
			notifInterval: 120000,
			notifEnabled: true,
			soundEnabled: true,
			fontSize: "medium",
			accounts: []
		};
		this._channelPollTimer = null;
		this._loadingChannels = false;
	}

	componentDidMount(): void {
		this._initTheme();
		this._initSettings();
		this.tryAutoLogin();
	}

	componentWillUnmount(): void {
		this.stopChannelPolling();
	}

	// ── Theme ──────────────────────────────────────────────

	async _initTheme(): Promise<void> {
		try {
			const mode = await loadThemeMode();
			this.setState({ themeMode: mode });
			this._applyThemeToDOM(mode);
		} catch (_err) {}
	}

	_applyThemeToDOM(mode: string): void {
		try {
			document.documentElement.setAttribute("data-theme", mode);
		} catch (_e) {}
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
		} catch (_err) {}
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
		} catch (_err) {
			this.setState({ initializing: false });
		}
	}

	async doLogin(token: string): Promise<void> {
		const slack = new SlackAPI(token);
		let auth;
		try {
			auth = await performAuth(slack, token);
		} catch (err: any) {
			this.setState({ initializing: false });
			throw new Error(err.message || "Authentication failed");
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
	}

	async handleLogout(): Promise<void> {
		this.stopChannelPolling();
		const accounts = await removeAccount(this.state.accounts, this.state.currentUser || "");

		if (accounts.length > 0) {
			this.setState({ accounts: accounts });
			try {
				await this.switchAccount(accounts[0]);
			} catch (_err) {
				await clearToken();
				this.setState(Object.assign({}, getResetState(), { accounts: accounts }));
			}
		} else {
			await clearToken();
			this.setState(Object.assign({}, getResetState(), { accounts: [] }));
		}
	}

	async switchAccount(account: AccountEntry): Promise<void> {
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
		} catch (err: any) {
			console.warn("loadTeamInfo error:", err.message);
		}
	}

	async _loadUsers(slack: ISlackAPI): Promise<void> {
		try {
			const usersMap = await fetchAllUsers(slack);
			this.setState({ usersMap: usersMap });
		} catch (_err) {}
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
				this.setState({ channels: result.channels, channelsLoading: false });
			}
		} catch (err: any) {
			if (err.message === "ratelimited") {
				console.warn("loadChannels rate limited, backing off");
			} else {
				console.warn("loadChannels error: " + err.message);
			}
			this.setState({ channelsLoading: false });
		}
		this._loadingChannels = false;
	}

	// ── Channel Polling ────────────────────────────────────

	startChannelPolling(slack: ISlackAPI): void {
		this.stopChannelPolling();
		if (!this.state.notifEnabled) return;
		const self = this;
		const interval = this.state.notifInterval || 120000;
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
						onSelectMessage={function (msg: any) {
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
						fontSize={this.state.fontSize}
						onToggleNotif={function () {
							self._handleToggleNotif();
						}}
						onChangeInterval={function (ms: number) {
							self._handleChangeInterval(ms);
						}}
						onToggleSound={function () {
							self._handleToggleSound();
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

		return (
			<View style={[styles.app, { backgroundColor: colors.bgSplash }]}>
				<StatusBar
					backgroundColor={colors.statusBar}
					barStyle={colors.statusBarStyle as any}
				/>
				{this.renderScreen()}
			</View>
		);
	}
}
