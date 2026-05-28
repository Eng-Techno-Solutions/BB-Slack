import { SlackAPI } from "./src/api";
import type { ISlackAPI } from "./src/api/types";
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
	syncAccountsToNative
} from "./src/services/nativeNotification";
import {
	getActiveChannelId,
	popScreen,
	pushScreen,
	replaceTopScreen
} from "./src/services/navigationManager";
import RTMClient from "./src/services/rtmClient";
import {
	fetchAllUsers,
	fetchTeamIcon,
	loadChannelsWithUnreadDetection,
	updateAccountTeamIcon
} from "./src/services/slackDataLoader";
import { getMode, setFontSizeKey, setMode } from "./src/theme";
import type { FontSizeKey } from "./src/theme";
import type { RTMEvent } from "./src/types";
import type { AccountEntry, SlackChannel, SlackMessage, SlackResponse } from "./src/types";
import type { AppProps as Props, AppState as State, AppStyles as Styles } from "./src/types";
import {
	clearToken,
	getAccounts,
	getActiveAccountId,
	getFontSize,
	getNotifEnabled,
	getNotifInterval,
	getSoundEnabled,
	getTheme,
	getToken,
	saveAccounts,
	saveActiveAccountId,
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

export default class App extends Component<Props, State> {
	_notifPollTimer: ReturnType<typeof setInterval> | null;
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
			stack: [{ screen: "login", params: {} }],
			notifInterval: 120000,
			notifEnabled: true,
			soundEnabled: true,
			fontSize: "medium",
			themeMode: "dark",
			accounts: [],
			rtmConnected: false
		};
		this._notifPollTimer = null;
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
		} catch (err) {
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
		} catch (err) {
			// Token save failed but login can continue
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
		} catch (err) {}

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
			console.warn("loadTeamInfo error:", errorMessage(err, "unknown"));
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
				this._getCurrentChannelId()
			);
			if (result.changed) {
				this.setState({ channels: result.channels, channelsLoading: false });
			} else if (isFirstLoad) {
				this.setState({ channelsLoading: false });
			}
		} catch (err: unknown) {
			if (errorMessage(err, "") === "ratelimited") {
				console.warn("loadChannels rate limited, backing off");
			}
			this.setState({ channelsLoading: false });
		}
		this._loadingChannels = false;
	}

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
		} catch (_e) {}

		if (accounts.length > 0) {
			this.setState({ accounts: accounts });
			try {
				await this.switchAccount(accounts[0]);
			} catch (err) {
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
		} catch (_e) {}
		this.setState({ accounts: accounts });
	}

	_handleAppState(state: string): void {
		if (state === "active") {
			stopBackgroundNotifications();
			if (this.state.notifEnabled) this._startNotifPolling();
			if (this.state.slack) this._connectRTM(this.state.slack);
		} else if (state === "background") {
			this._stopNotifPolling();
			this._rtm.disconnect();
			if (this.state.notifEnabled && this.state.accounts.length > 0) {
				startBackgroundNotifications();
			}
		}
	}

	_connectRTM(slack: ISlackAPI): void {
		if (this._rtm.isConnected()) return;
		const self = this;

		this._rtm.on("message", function (event: RTMEvent) {
			const channelId = event.channel;
			if (!channelId) return;
			const handler = self._rtmChannelHandlers[channelId];
			if (handler) {
				handler();
			} else {
				if (event.user !== self.state.currentUser) {
					self._loadChannels(slack);
				}
			}
		});

		this._rtm.on("reaction_added", function (event: RTMEvent) {
			var item = event.item;
			if (item && item.channel) {
				var handler = self._rtmChannelHandlers[item.channel];
				if (handler) handler();
			}
		});

		this._rtm.on("reaction_removed", function (event: RTMEvent) {
			var item = event.item;
			if (item && item.channel) {
				var handler = self._rtmChannelHandlers[item.channel];
				if (handler) handler();
			}
		});

		this._rtm.on("channel_marked", function () {
			self._loadChannels(slack);
		});

		this._rtm.on("group_marked", function () {
			self._loadChannels(slack);
		});

		this._rtm.on("im_marked", function () {
			self._loadChannels(slack);
		});

		this._rtm.on("_status", function () {
			var isConnected = self._rtm.isConnected();
			self.setState({ rtmConnected: isConnected });
			self._startNotifPolling();
		});

		this._rtm.connect(slack);
	}

	_registerRTMHandler(channelId: string, handler: () => void): void {
		this._rtmChannelHandlers[channelId] = handler;
	}

	_unregisterRTMHandler(channelId: string): void {
		delete this._rtmChannelHandlers[channelId];
	}

	async _loadTheme(): Promise<void> {
		try {
			const mode = await getTheme();
			setMode(mode);
			this.setState({ themeMode: mode });
		} catch (err) {}
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
			const font = await getFontSize();
			setNotificationMuted(!sound);
			setFontSizeKey(font);
			this.setState(
				{ notifInterval: interval, notifEnabled: enabled, soundEnabled: sound, fontSize: font },
				function (this: App) {
					if (enabled) {
						this._startNotifPolling();
					}
				}.bind(this)
			);
		} catch (err) {
			this._startNotifPolling();
		}
	}

	async _handleToggleNotif(): Promise<void> {
		const enabled = !this.state.notifEnabled;
		await saveNotifEnabled(enabled);
		this.setState({ notifEnabled: enabled });
		if (enabled) {
			this._startNotifPolling();
		} else {
			this._stopNotifPolling();
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

		return (
			<View style={styles.app}>
				<StatusBar
					backgroundColor="#19171D"
					barStyle="light-content"
				/>
				{this.renderScreen()}
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
