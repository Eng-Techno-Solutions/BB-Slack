import SlackAPI from "./src/api/slack";
import ChannelInfoScreen from "./src/screens/ChannelInfoScreen";
import ChannelListScreen from "./src/screens/ChannelListScreen";
import ChatScreen from "./src/screens/ChatScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SearchScreen from "./src/screens/SearchScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ThreadScreen from "./src/screens/ThreadScreen";
import { getMode, setFontSizeKey, setMode } from "./src/theme";
import type { FontSizeKey } from "./src/theme";
import { playNotification, setNotificationMuted } from "./src/utils/notificationSound";
import {
	clearToken,
	getAccounts,
	getActiveAccountId,
	getFontSize,
	getNotifEnabled,
	getNotifInterval,
	getSoundEnabled,
	getToken,
	saveAccounts,
	saveActiveAccountId,
	saveFontSize,
	saveNotifEnabled,
	saveNotifInterval,
	saveSoundEnabled,
	saveToken
} from "./src/utils/storage";
import { getTheme, saveTheme } from "./src/utils/storage";
import React, { Component } from "react";
import {
	ActivityIndicator,
	AppState,
	BackHandler,
	StatusBar,
	StyleSheet,
	View
} from "react-native";
import type { NativeEventSubscription, ViewStyle } from "react-native";

interface SlackChannel {
	id: string;
	is_im?: boolean;
	unread_count_display?: number;
	[key: string]: unknown;
}

interface SlackUser {
	id: string;
	name?: string;
	real_name?: string;
	profile?: Record<string, unknown>;
	[key: string]: unknown;
}

interface SlackMessage {
	ts: string;
	text?: string;
	user: string;
	[key: string]: unknown;
}

interface AccountEntry {
	token: string;
	teamName: string;
	teamId: string;
	userId: string;
	userName: string;
	teamIcon: string;
}

interface StackEntry {
	screen: string;
	params: Record<string, any>;
}

interface Props {}

interface State {
	initializing: boolean;
	slack: any;
	currentUser: string | null;
	teamName: string;
	teamIcon: string;
	usersMap: Record<string, SlackUser>;
	channels: SlackChannel[];
	channelsLoading: boolean;
	stack: StackEntry[];
	notifInterval: number;
	notifEnabled: boolean;
	soundEnabled: boolean;
	fontSize: string;
	themeMode: string;
	accounts: AccountEntry[];
}

export default class App extends Component<Props, State> {
	_notifPollTimer: ReturnType<typeof setInterval> | null;
	_notifPolling: boolean;
	_backHandler: NativeEventSubscription | null;
	_appStateListener: NativeEventSubscription | null;

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
			accounts: []
		};
		this._notifPollTimer = null;
		this._notifPolling = false;
		this._backHandler = null;
		this._appStateListener = null;
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
		let auth: any;
		try {
			auth = await slack.authTest();
		} catch (err: any) {
			this.setState({ initializing: false });
			throw new Error(err.message || "Authentication failed");
		}

		if (!auth || !auth.user_id) {
			this.setState({ initializing: false });
			throw new Error("Invalid authentication response");
		}

		try {
			await saveToken(token);
		} catch (err) {
			// Token save failed but login can continue
		}

		const _self = this;
		const accounts = this.state.accounts.slice();
		const existingIdx = accounts.findIndex(function (a: AccountEntry) {
			return a.userId === auth.user_id;
		});
		const accountEntry: AccountEntry = {
			token: token,
			teamName: auth.team || "",
			teamId: auth.team_id || "",
			userId: auth.user_id,
			userName: auth.user || "",
			teamIcon: ""
		};
		if (existingIdx >= 0) {
			accounts[existingIdx] = Object.assign({}, accounts[existingIdx], accountEntry);
		} else {
			accounts.push(accountEntry);
		}

		try {
			await saveAccounts(accounts);
			await saveActiveAccountId(auth.user_id);
		} catch (err) {}

		this.setState({
			slack: slack,
			currentUser: auth.user_id,
			teamName: auth.team || "",
			stack: [{ screen: "channelList", params: {} }],
			initializing: false,
			accounts: accounts
		});

		this.loadUsers(slack);
		this.loadChannels(slack);
		this.loadTeamInfo(slack);
		this._loadNotifSettings();
	}

	async loadTeamInfo(slack: any): Promise<void> {
		try {
			const res = await slack.teamInfo();
			const icon =
				res.team && res.team.icon ? res.team.icon.image_68 || res.team.icon.image_44 || "" : "";
			this.setState({ teamIcon: icon });
			const self = this;
			const accounts = this.state.accounts.slice();
			const idx = accounts.findIndex(function (a: AccountEntry) {
				return a.userId === self.state.currentUser;
			});
			if (idx >= 0 && accounts[idx].teamIcon !== icon) {
				accounts[idx] = Object.assign({}, accounts[idx], { teamIcon: icon });
				this.setState({ accounts: accounts });
				try {
					await saveAccounts(accounts);
				} catch (_e) {}
			}
		} catch (err: any) {
			console.warn("loadTeamInfo error:", err.message);
		}
	}

	async loadUsers(slack: any): Promise<void> {
		try {
			const usersMap: Record<string, SlackUser> = {};
			let cursor = "";
			do {
				const res = await slack.usersList(cursor || undefined, 200);
				const members = res.members || [];
				for (let i = 0; i < members.length; i++) {
					usersMap[members[i].id] = members[i];
				}
				cursor =
					res.response_metadata && res.response_metadata.next_cursor
						? res.response_metadata.next_cursor
						: "";
			} while (cursor);

			this.setState({ usersMap: usersMap });
		} catch (err) {
			// Users will load on demand
		}
	}

	async loadChannels(slack: any): Promise<void> {
		this.setState({ channelsLoading: true });
		try {
			let allChannels: SlackChannel[] = [];
			let cursor = "";
			do {
				const res = await slack.conversationsList(
					"public_channel,private_channel,mpim,im",
					cursor || undefined,
					200
				);
				allChannels = allChannels.concat(res.channels || []);
				cursor =
					res.response_metadata && res.response_metadata.next_cursor
						? res.response_metadata.next_cursor
						: "";
			} while (cursor);

			this.setState({ channels: allChannels, channelsLoading: false });
		} catch (err) {
			this.setState({ channelsLoading: false });
		}
	}

	async handleLogout(): Promise<void> {
		this._stopNotifPolling();
		const currentUserId = this.state.currentUser;
		const accounts = this.state.accounts.filter(function (a: AccountEntry) {
			return a.userId !== currentUserId;
		});
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
			if (this.state.notifEnabled) this._startNotifPolling();
		} else if (state === "background") {
			this._stopNotifPolling();
		}
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
		const interval = this.state.notifInterval || 120000;
		this._notifPollTimer = setInterval(function () {
			if (self.state.slack && !self._notifPolling) self._pollUnreads();
		}, interval);
	}

	_stopNotifPolling(): void {
		if (this._notifPollTimer) {
			clearInterval(this._notifPollTimer);
			this._notifPollTimer = null;
		}
	}

	_getCurrentChannelId(): string | null {
		const stack = this.state.stack;
		const current = stack[stack.length - 1];
		if (current.screen === "chat" && current.params && current.params.channel) {
			return current.params.channel.id;
		}
		return null;
	}

	async _pollUnreads(): Promise<void> {
		const { slack, currentUser, channels: oldChannels } = this.state;
		if (!slack || !currentUser) return;
		this._notifPolling = true;
		try {
			let allChannels: SlackChannel[] = [];
			let cursor = "";
			do {
				const res = await slack.conversationsList(
					"public_channel,private_channel,mpim,im",
					cursor || undefined,
					200
				);
				allChannels = allChannels.concat(res.channels || []);
				cursor =
					res.response_metadata && res.response_metadata.next_cursor
						? res.response_metadata.next_cursor
						: "";
			} while (cursor);

			const oldUnreadMap: Record<string, number> = {};
			for (let i = 0; i < oldChannels.length; i++) {
				oldUnreadMap[oldChannels[i].id] = oldChannels[i].unread_count_display || 0;
			}

			const currentChId = this._getCurrentChannelId();
			let hasNewUnread = false;

			for (let i = 0; i < allChannels.length; i++) {
				const ch = allChannels[i];
				const oldCount = oldUnreadMap[ch.id] || 0;
				const newCount = ch.unread_count_display || 0;
				if (newCount > oldCount && ch.id !== currentChId) {
					hasNewUnread = true;
					break;
				}
			}

			if (hasNewUnread) {
				playNotification();
			}

			let unreadChanged = allChannels.length !== oldChannels.length || hasNewUnread;
			if (!unreadChanged) {
				for (let u = 0; u < allChannels.length; u++) {
					if ((allChannels[u].unread_count_display || 0) !== (oldUnreadMap[allChannels[u].id] || 0)) {
						unreadChanged = true;
						break;
					}
				}
			}
			if (unreadChanged) this.setState({ channels: allChannels });
		} catch (err) {
			// Silent fail
		}
		this._notifPolling = false;
	}

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

interface Styles {
	app: ViewStyle;
	splash: ViewStyle;
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
