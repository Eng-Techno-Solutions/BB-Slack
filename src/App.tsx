import SlackAPI from "./api/slack";
import ChannelInfoScreen from "./screens/ChannelInfoScreen";
import ChannelListScreen from "./screens/ChannelListScreen";
import ChatScreen from "./screens/ChatScreen";
import LoginScreen from "./screens/LoginScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SearchScreen from "./screens/SearchScreen";
import SettingsScreen from "./screens/SettingsScreen";
import ThreadScreen from "./screens/ThreadScreen";
import { getColors, getMode, setFontSizeKey, setMode } from "./theme";
import type { FontSizeKey } from "./theme";
import { playNotification, setNotificationMuted } from "./utils/notificationSound";
import {
	clearToken,
	getAccounts,
	getActiveAccountId,
	getFontSize,
	getSoundEnabled,
	getTheme,
	getToken,
	saveAccounts,
	saveActiveAccountId,
	saveFontSize,
	saveSoundEnabled,
	saveTheme,
	saveToken
} from "./utils/storage";
import {
	getNotifEnabled,
	getNotifInterval,
	saveNotifEnabled,
	saveNotifInterval
} from "./utils/storage";
import React, { Component } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";

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
	themeMode: string;
	notifInterval: number;
	notifEnabled: boolean;
	soundEnabled: boolean;
	fontSize: string;
	accounts: AccountEntry[];
}

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
		this.loadTheme();
		this.loadNotifSettings();
		this.tryAutoLogin();
	}

	componentWillUnmount(): void {
		this.stopChannelPolling();
	}

	async loadTheme(): Promise<void> {
		try {
			const mode = await getTheme();
			setMode(mode);
			this.setState({ themeMode: mode });
			this._applyThemeToDOM(mode);
		} catch (err) {
			// Default dark
		}
	}

	_applyThemeToDOM(mode: string): void {
		try {
			document.documentElement.setAttribute("data-theme", mode);
		} catch (_e) {
			// Non-web platform
		}
	}

	toggleTheme(): void {
		const newMode = getMode() === "dark" ? "light" : "dark";
		setMode(newMode);
		this.setState({ themeMode: newMode });
		saveTheme(newMode);
		this._applyThemeToDOM(newMode);
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

		this.loadTeamInfo(slack);
		this.loadUsers(slack);
		this.loadChannels(slack);
		this.startChannelPolling(slack);
	}

	startChannelPolling(slack: any): void {
		this.stopChannelPolling();
		if (!this.state.notifEnabled) return;
		const self = this;
		const interval = this.state.notifInterval || 120000;
		this._channelPollTimer = setInterval(function () {
			self.loadChannels(slack);
		}, interval);
	}

	stopChannelPolling(): void {
		if (this._channelPollTimer) {
			clearInterval(this._channelPollTimer);
			this._channelPollTimer = null;
		}
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
		if (this._loadingChannels) return;
		this._loadingChannels = true;
		const isFirstLoad = this.state.channels.length === 0;
		const oldChannels = this.state.channels;
		if (isFirstLoad) this.setState({ channelsLoading: true });
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

			if (!isFirstLoad && oldChannels.length > 0) {
				const oldUnreadMap: Record<string, number> = {};
				for (let i = 0; i < oldChannels.length; i++) {
					oldUnreadMap[oldChannels[i].id] = oldChannels[i].unread_count_display || 0;
				}

				const stack = this.state.stack;
				const currentScreen = stack[stack.length - 1];
				const activeChannelId =
					currentScreen.screen === "chat" && currentScreen.params.channel
						? currentScreen.params.channel.id
						: null;

				let hasNewUnread = false;
				for (let j = 0; j < allChannels.length; j++) {
					const ch = allChannels[j];
					const oldCount = oldUnreadMap[ch.id] || 0;
					const newCount = ch.unread_count_display || 0;
					if (newCount > oldCount && ch.id !== activeChannelId) {
						hasNewUnread = true;
						break;
					}
				}

				if (hasNewUnread) {
					playNotification();
				}
			}

			let channelDataChanged = isFirstLoad || allChannels.length !== oldChannels.length;
			if (!channelDataChanged) {
				const oldUnread: Record<string, number> = {};
				for (let oi = 0; oi < oldChannels.length; oi++) {
					oldUnread[oldChannels[oi].id] = oldChannels[oi].unread_count_display || 0;
				}
				for (let ni = 0; ni < allChannels.length; ni++) {
					if ((allChannels[ni].unread_count_display || 0) !== (oldUnread[allChannels[ni].id] || 0)) {
						channelDataChanged = true;
						break;
					}
				}
			}
			if (channelDataChanged) {
				this.setState({ channels: allChannels, channelsLoading: false });
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

	async loadNotifSettings(): Promise<void> {
		try {
			const interval = await getNotifInterval();
			const enabled = await getNotifEnabled();
			const sound = await getSoundEnabled();
			const font = await getFontSize();
			setNotificationMuted(!sound);
			setFontSizeKey(font);
			const self = this;
			this.setState(
				{ notifInterval: interval, notifEnabled: enabled, soundEnabled: sound, fontSize: font },
				function () {
					if (enabled && self.state.slack) {
						self.startChannelPolling(self.state.slack);
					}
				}
			);
		} catch (err) {
			// Defaults
		}
	}

	async handleToggleNotif(): Promise<void> {
		const enabled = !this.state.notifEnabled;
		await saveNotifEnabled(enabled);
		this.setState({ notifEnabled: enabled });
		if (enabled) {
			this.startChannelPolling(this.state.slack);
		} else {
			this.stopChannelPolling();
		}
	}

	async handleChangeInterval(ms: number): Promise<void> {
		await saveNotifInterval(ms);
		this.setState({ notifInterval: ms });
		if (this.state.notifEnabled && this.state.slack) {
			this.stopChannelPolling();
			this.startChannelPolling(this.state.slack);
		}
	}

	async handleToggleSound(): Promise<void> {
		const enabled = !this.state.soundEnabled;
		await saveSoundEnabled(enabled);
		setNotificationMuted(!enabled);
		this.setState({ soundEnabled: enabled });
	}

	async handleChangeFontSize(size: string): Promise<void> {
		await saveFontSize(size as FontSizeKey);
		setFontSizeKey(size as FontSizeKey);
		this.setState({ fontSize: size });
	}

	async handleLogout(): Promise<void> {
		this.stopChannelPolling();
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
		this.stopChannelPolling();
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
							self.handleToggleNotif();
						}}
						onChangeInterval={function (ms: number) {
							self.handleChangeInterval(ms);
						}}
						onToggleSound={function () {
							self.handleToggleSound();
						}}
						onToggleTheme={function () {
							self.toggleTheme();
						}}
						onChangeFontSize={function (s: string) {
							self.handleChangeFontSize(s);
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

interface Styles {
	app: ViewStyle;
	splash: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
	app: {
		flex: 1
	},
	splash: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	}
});
