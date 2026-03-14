import Icon from "../components/Icon";
import SlackText from "../components/SlackText";
import WorkspaceDrawer from "../components/WorkspaceDrawer";
import { getColors, getMode } from "../theme";
import { getChannelDisplayName } from "../utils/format";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import React, { Component } from "react";
import {
	ActivityIndicator,
	FlatList,
	Image,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableHighlight,
	TouchableOpacity,
	View
} from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

interface SlackUserProfile {
	display_name?: string;
	image_72?: string;
	image_48?: string;
	[key: string]: unknown;
}

interface SlackUser {
	id: string;
	name?: string;
	real_name?: string;
	deleted?: boolean;
	is_bot?: boolean;
	profile?: SlackUserProfile;
	[key: string]: unknown;
}

interface SlackChannel {
	id: string;
	is_im?: boolean;
	is_mpim?: boolean;
	is_private?: boolean;
	user?: string;
	unread_count_display?: number;
	topic?: { value: string };
	_sectionHeader?: string;
	[key: string]: unknown;
}

interface SlackAPI {
	token: string;
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

interface KeyEvent {
	action: string;
	[key: string]: unknown;
}

interface KeySub {
	remove(): void;
}

interface TabItem {
	key: string;
	label: string;
	icon: string;
}

interface UnreadCounts {
	channelsUnread: number;
	dmsUnread: number;
	total: number;
}

const TABS: TabItem[] = [
	{ key: "channels", label: "Channels", icon: "hash" },
	{ key: "dms", label: "DMs", icon: "message-square" }
];

interface Props {
	slack: SlackAPI;
	channels: SlackChannel[];
	usersMap: Record<string, SlackUser>;
	currentUserId: string;
	loading: boolean;
	teamName: string;
	teamIcon: string;
	accounts?: AccountEntry[];
	activeAccountId?: string | null;
	onSelect: (channel: SlackChannel) => void;
	onSearch: () => void;
	onLogout: () => void;
	onSettings: () => void;
	onSwitchAccount?: (account: AccountEntry) => void;
	onAddAccount?: () => void;
	onRemoveAccount?: (account: AccountEntry) => void;
	themeMode?: string;
}

interface State {
	tab: string;
	filter: string;
	focusIndex: number;
	focusZone: "list" | "header";
	headerIndex: number;
	teamIconError: boolean;
	drawerOpen: boolean;
}

export default class ChannelListScreen extends Component<Props, State> {
	_keySub: KeySub | null;
	_data: SlackChannel[];
	_cachedChannels: SlackChannel[] | null;
	_cachedTab: string | null;
	_cachedFilter: string | null;
	_cachedFilteredResult: SlackChannel[] | null;
	_cachedUnreadChannels: SlackChannel[] | null;
	_cachedUnreadResult: UnreadCounts | null;
	_list: FlatList<SlackChannel> | null;
	_keyExtractor: (item: SlackChannel) => string;
	_renderItem: (obj: { item: SlackChannel; index: number }) => React.ReactElement;
	_listRef: (r: FlatList<SlackChannel> | null) => void;
	_onFilterChange: (t: string) => void;

	constructor(props: Props) {
		super(props);
		this.state = {
			tab: "channels",
			filter: "",
			focusIndex: -1,
			focusZone: "list",
			headerIndex: 0,
			teamIconError: false,
			drawerOpen: false
		};
		this._keySub = null;
		this._data = [];
		this._cachedChannels = null;
		this._cachedTab = null;
		this._cachedFilter = null;
		this._cachedFilteredResult = null;
		this._cachedUnreadChannels = null;
		this._cachedUnreadResult = null;
		this._list = null;
		const self = this;
		this._keyExtractor = function (item: SlackChannel) {
			return item._sectionHeader || item.id;
		};
		this._renderItem = function (obj: { item: SlackChannel; index: number }) {
			return self._renderListItem(obj);
		};
		this._listRef = function (r: FlatList<SlackChannel> | null) {
			self._list = r;
		};
		this._onFilterChange = function (t: string) {
			self.setState({ filter: t });
		};
	}

	componentDidMount(): void {
		const self = this;
		this._keySub = addKeyEventListener(function (e: KeyEvent) {
			self.handleKeyEvent(e);
		});
	}

	componentWillUnmount(): void {
		removeKeyEventListener(this._keySub);
	}

	componentDidUpdate(prevProps: Props): void {
		if (prevProps.teamIcon !== this.props.teamIcon) {
			this.setState({ teamIconError: false });
		}
	}

	handleKeyEvent(e: KeyEvent): void {
		const action = e.action;
		const data = this._data;
		const self = this;

		if (this.state.focusZone === "header") {
			const hi = this.state.headerIndex;
			if (action === "down") {
				if (hi < 5) {
					this.setState({ headerIndex: hi + 1 });
				} else {
					let first = 0;
					while (first < data.length && data[first]._sectionHeader) first++;
					this.setState({ focusZone: "list", focusIndex: first < data.length ? first : -1 });
				}
			} else if (action === "up") {
				if (hi > 0) {
					this.setState({ headerIndex: hi - 1 });
				}
			} else if (action === "select") {
				if (hi === 0) self.setState({ drawerOpen: true });
				else if (hi === 1) self.props.onSearch();
				else if (hi === 2) self.props.onSettings();
				else if (hi === 3) self.setState({ tab: "channels", focusZone: "list", focusIndex: -1 });
				else if (hi === 4) self.setState({ tab: "dms", focusZone: "list", focusIndex: -1 });
				else if (hi === 5) self.props.onLogout();
			} else if (action === "back") {
				this.setState({ focusZone: "list", focusIndex: -1 });
			}
		} else {
			const idx = this.state.focusIndex;
			if (action === "down") {
				if (data.length === 0) return;
				let next = idx < 0 ? 0 : idx + 1;
				while (next < data.length && data[next]._sectionHeader) next++;
				if (next < data.length) {
					this.setState({ focusIndex: next });
					if (this._list)
						try {
							this._list.scrollToIndex({ index: next, viewOffset: 80, animated: true });
						} catch (_e) {}
				}
			} else if (action === "up") {
				if (data.length === 0) return;
				let prev = idx < 0 ? 0 : idx - 1;
				while (prev >= 0 && data[prev]._sectionHeader) prev--;
				if (prev >= 0) {
					this.setState({ focusIndex: prev });
					if (this._list)
						try {
							this._list.scrollToIndex({ index: prev, viewOffset: 80, animated: true });
						} catch (_e) {}
				} else {
					this.setState({ focusZone: "header", headerIndex: 5, focusIndex: -1 });
				}
			} else if (action === "select") {
				if (idx >= 0 && idx < data.length && !data[idx]._sectionHeader) {
					this.props.onSelect(data[idx]);
				}
			} else if (action === "right") {
				const newTab = this.state.tab === "channels" ? "dms" : "channels";
				this.setState({ tab: newTab, focusIndex: -1 });
			}
		}
	}

	isBot(ch: SlackChannel): boolean {
		const { usersMap } = this.props;
		if (!ch.is_im) return false;
		const u = usersMap[ch.user || ""];
		return !!(u && (u.is_bot || u.id === "USLACKBOT"));
	}

	getUnreadCounts(): UnreadCounts {
		const { channels } = this.props;
		if (this._cachedUnreadChannels === channels && this._cachedUnreadResult) {
			return this._cachedUnreadResult;
		}
		let channelsUnread = 0;
		let dmsUnread = 0;
		for (let i = 0; i < channels.length; i++) {
			const ch = channels[i];
			const count = ch.unread_count_display || 0;
			if (count > 0) {
				if (ch.is_im || ch.is_mpim) {
					dmsUnread += count;
				} else {
					channelsUnread += count;
				}
			}
		}
		this._cachedUnreadChannels = channels;
		this._cachedUnreadResult = {
			channelsUnread: channelsUnread,
			dmsUnread: dmsUnread,
			total: channelsUnread + dmsUnread
		};
		return this._cachedUnreadResult;
	}

	getFilteredChannels(): SlackChannel[] {
		const { channels, usersMap, currentUserId } = this.props;
		const { tab, filter } = this.state;
		if (
			this._cachedChannels === channels &&
			this._cachedTab === tab &&
			this._cachedFilter === filter &&
			this._cachedFilteredResult
		) {
			return this._cachedFilteredResult;
		}
		const lowerFilter = filter.toLowerCase();
		const self = this;

		let filtered = channels.filter(function (ch: SlackChannel) {
			if (tab === "channels") {
				return !ch.is_im && !ch.is_mpim;
			} else {
				if (!ch.is_im && !ch.is_mpim) return false;
				if (ch.is_im) {
					const u = usersMap[ch.user || ""];
					if (u && u.deleted) return false;
				}
				return true;
			}
		});

		if (lowerFilter) {
			filtered = filtered.filter(function (ch: SlackChannel) {
				const name = getChannelDisplayName(ch, usersMap, currentUserId);
				return name.toLowerCase().indexOf(lowerFilter) !== -1;
			});
		}

		const sortFn = function (a: SlackChannel, b: SlackChannel): number {
			const aUnread = (a.unread_count_display || 0) > 0 ? 1 : 0;
			const bUnread = (b.unread_count_display || 0) > 0 ? 1 : 0;
			if (bUnread !== aUnread) return bUnread - aUnread;
			const aName = getChannelDisplayName(a, usersMap, currentUserId).toLowerCase();
			const bName = getChannelDisplayName(b, usersMap, currentUserId).toLowerCase();
			if (aName < bName) return -1;
			if (aName > bName) return 1;
			return 0;
		};

		if (tab === "dms") {
			const people: SlackChannel[] = [];
			const apps: SlackChannel[] = [];
			for (let i = 0; i < filtered.length; i++) {
				if (self.isBot(filtered[i])) {
					apps.push(filtered[i]);
				} else {
					people.push(filtered[i]);
				}
			}
			people.sort(sortFn);
			apps.sort(sortFn);
			let result: SlackChannel[] = people;
			if (apps.length > 0) {
				result = result.concat(
					[{ _sectionHeader: "Apps", id: "__apps_section__" } as SlackChannel],
					apps
				);
			}
			this._cachedChannels = channels;
			this._cachedTab = tab;
			this._cachedFilter = filter;
			this._cachedFilteredResult = result;
			return result;
		}

		filtered.sort(sortFn);
		this._cachedChannels = channels;
		this._cachedTab = tab;
		this._cachedFilter = filter;
		this._cachedFilteredResult = filtered;
		return filtered;
	}

	getProfileImage(userId: string): string | null {
		const { usersMap, slack } = this.props;
		const u = usersMap[userId];
		if (!u || !u.profile) return null;
		let url = u.profile.image_72 || u.profile.image_48 || null;
		if (Platform.OS === "web" && url && slack && slack.token) {
			url = "/slack-file?url=" + encodeURIComponent(url) + "&token=" + encodeURIComponent(slack.token);
		}
		return url;
	}

	renderItem(item: SlackChannel, isFocused: boolean): React.ReactElement {
		const { usersMap, currentUserId, onSelect } = this.props;
		const c = getColors();
		const name = getChannelDisplayName(item, usersMap, currentUserId);
		const unread = item.unread_count_display || 0;
		let prefix = "";
		const isDm = item.is_im || item.is_mpim;
		if (!isDm) {
			prefix = item.is_private ? "lock" : "# ";
		}
		const imageUrl = isDm && item.is_im ? this.getProfileImage(item.user || "") : null;

		return (
			<TouchableHighlight
				style={[styles.item, isFocused && { backgroundColor: c.listUnderlay }]}
				underlayColor={c.listUnderlay}
				onPress={function () {
					onSelect(item);
				}}
				data-type="list-item">
				<View style={styles.itemInner}>
					{isDm ? (
						imageUrl ? (
							<Image
								source={{ uri: imageUrl }}
								style={styles.itemAvatar}
							/>
						) : (
							<View
								style={[
									styles.itemAvatar,
									styles.itemAvatarPlaceholder,
									{ backgroundColor: c.avatarPlaceholderBg }
								]}>
								<Text style={styles.itemAvatarText}>{(name[0] || "?").toUpperCase()}</Text>
							</View>
						)
					) : (
						<View style={[styles.itemAvatar, { backgroundColor: c.channelAvatarBg }]}>
							{prefix === "lock" ? (
								<Icon
									name="lock"
									size={14}
									color={c.textTertiary}
								/>
							) : (
								<Text style={[styles.channelAvatarHash, { color: c.textTertiary }]}>#</Text>
							)}
						</View>
					)}
					<View style={styles.itemLeft}>
						<View style={styles.itemNameRow}>
							<Text
								style={[
									styles.itemName,
									{ color: c.textTertiary },
									unread > 0 && { color: c.textPrimary, fontWeight: "bold" }
								]}
								numberOfLines={1}>
								{name}
							</Text>
						</View>
						{item.topic && item.topic.value ? (
							<SlackText
								text={item.topic.value}
								style={[styles.itemTopic, { color: c.textPlaceholder }]}
								numberOfLines={1}
							/>
						) : null}
					</View>
					{unread > 0 ? (
						<View style={[styles.badge, { backgroundColor: c.badgeBg }]}>
							<Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
						</View>
					) : null}
				</View>
			</TouchableHighlight>
		);
	}

	_renderListItem(obj: { item: SlackChannel; index: number }): React.ReactElement {
		const c = getColors();
		if (obj.item._sectionHeader) {
			return (
				<View style={[styles.sectionHeader, { borderBottomColor: c.border }]}>
					<Text style={[styles.sectionHeaderText, { color: c.textPlaceholder }]}>
						{obj.item._sectionHeader}
					</Text>
				</View>
			);
		}
		return this.renderItem(obj.item, obj.index === this.state.focusIndex);
	}

	render(): React.ReactElement {
		const { tab, filter, focusZone, headerIndex, drawerOpen } = this.state;
		const {
			loading,
			onSearch,
			onLogout,
			onSettings,
			teamName,
			teamIcon,
			accounts,
			activeAccountId,
			onSwitchAccount,
			onAddAccount,
			onRemoveAccount
		} = this.props;
		const self = this;
		const data = this.getFilteredChannels();
		this._data = data;
		const c = getColors();
		const _isDark = getMode() === "dark";
		const unreadCounts = this.getUnreadCounts();
		const hf = focusZone === "header";

		return (
			<View style={[styles.container, { backgroundColor: c.bg }]}>
				<View
					style={[styles.header, { backgroundColor: c.bgHeader, borderBottomColor: c.headerBorder }]}>
					<TouchableOpacity
						style={[styles.burgerBtn, hf && headerIndex === 0 && styles.headerFocused]}
						onPress={function () {
							self.setState({ drawerOpen: true });
						}}
						data-type="icon-btn">
						<Icon
							name="menu"
							size={20}
							color={c.headerIcon}
						/>
					</TouchableOpacity>
					<View style={styles.headerLeft}>
						{teamIcon && !this.state.teamIconError ? (
							<Image
								source={{ uri: teamIcon }}
								style={styles.teamIcon}
								onError={function () {
									self.setState({ teamIconError: true });
								}}
							/>
						) : (
							<View style={[styles.teamIconPlaceholder, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
								<Text style={styles.teamIconText}>{(teamName || "B").charAt(0)}</Text>
							</View>
						)}
						<Text
							style={[styles.headerTitle, { color: c.headerText }]}
							numberOfLines={1}>
							{teamName || "BB Slack"}
						</Text>
					</View>
					{unreadCounts.total > 0 ? (
						<View style={[styles.headerBadge, { backgroundColor: c.badgeBg }]}>
							<Text style={styles.badgeText}>{unreadCounts.total > 99 ? "99+" : unreadCounts.total}</Text>
						</View>
					) : null}
					<TouchableOpacity
						style={[styles.searchBtn, hf && headerIndex === 1 && styles.headerFocused]}
						onPress={onSearch}
						data-type="icon-btn">
						<Icon
							name="search"
							size={18}
							color={c.headerIcon}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.searchBtn, hf && headerIndex === 2 && styles.headerFocused]}
						onPress={onSettings}
						data-type="icon-btn">
						<Icon
							name="settings"
							size={18}
							color={c.headerIcon}
						/>
					</TouchableOpacity>
				</View>
				<View style={[styles.tabs, { backgroundColor: c.bgHeader, borderBottomColor: c.headerBorder }]}>
					{TABS.map(function (t: TabItem) {
						const active = tab === t.key;
						return (
							<TouchableOpacity
								key={t.key}
								style={[
									styles.tab,
									active && [styles.tabActive, { borderBottomColor: c.tabTextActive }],
									hf && headerIndex === (t.key === "channels" ? 3 : 4) && styles.headerFocused
								]}
								onPress={function () {
									self.setState({ tab: t.key });
								}}
								data-type="tab-btn">
								<View style={styles.tabContent}>
									<Icon
										name={t.icon}
										size={15}
										color={active ? c.tabTextActive : c.tabText}
									/>
									<Text
										style={[
											styles.tabText,
											{ color: c.tabText },
											active && { color: c.tabTextActive, fontWeight: "bold" }
										]}>
										{t.label}
									</Text>
									{(t.key === "channels" ? unreadCounts.channelsUnread : unreadCounts.dmsUnread) > 0 ? (
										<View style={[styles.tabBadge, { backgroundColor: c.badgeBg }]}>
											<Text style={styles.tabBadgeText}>
												{(t.key === "channels" ? unreadCounts.channelsUnread : unreadCounts.dmsUnread) > 99
													? "99+"
													: t.key === "channels"
														? unreadCounts.channelsUnread
														: unreadCounts.dmsUnread}
											</Text>
										</View>
									) : null}
								</View>
							</TouchableOpacity>
						);
					})}
					<TouchableOpacity
						style={[styles.logoutBtn, hf && headerIndex === 5 && styles.headerFocused]}
						onPress={onLogout}
						data-type="icon-btn">
						<Icon
							name="log-out"
							size={16}
							color="rgba(255,255,255,0.6)"
						/>
					</TouchableOpacity>
				</View>
				<TextInput
					style={[
						styles.filter,
						{ backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: c.borderInput }
					]}
					placeholder="Filter..."
					placeholderTextColor={c.textPlaceholder}
					value={filter}
					onChangeText={this._onFilterChange}
					autoCorrect={false}
				/>
				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator
							size="large"
							color={c.accent}
						/>
					</View>
				) : (
					<FlatList
						ref={this._listRef}
						data={data}
						keyExtractor={this._keyExtractor}
						renderItem={this._renderItem}
						removeClippedSubviews={true}
						maxToRenderPerBatch={10}
						windowSize={9}
						initialNumToRender={15}
						ListEmptyComponent={
							<View style={styles.center}>
								<Text style={[styles.emptyText, { color: c.textTertiary }]}>No channels found</Text>
							</View>
						}
					/>
				)}
				<WorkspaceDrawer
					visible={drawerOpen}
					accounts={accounts || []}
					activeAccountId={activeAccountId || ""}
					onSwitch={onSwitchAccount as any}
					onAddAccount={onAddAccount || function () {}}
					onRemoveAccount={onRemoveAccount as any}
					onClose={function () {
						self.setState({ drawerOpen: false });
					}}
				/>
			</View>
		);
	}
}

interface Styles {
	container: ViewStyle;
	header: ViewStyle;
	burgerBtn: ViewStyle;
	headerLeft: ViewStyle;
	teamIcon: ImageStyle;
	teamIconPlaceholder: ViewStyle;
	teamIconText: TextStyle;
	headerTitle: TextStyle;
	themeBtn: ViewStyle;
	searchBtn: ViewStyle;
	headerBadge: ViewStyle;
	tabs: ViewStyle;
	tab: ViewStyle;
	tabActive: ViewStyle;
	tabContent: ViewStyle;
	tabText: TextStyle;
	tabBadge: ViewStyle;
	tabBadgeText: TextStyle;
	logoutBtn: ViewStyle;
	headerFocused: ViewStyle;
	filter: TextStyle;
	item: ViewStyle;
	itemInner: ViewStyle;
	itemAvatar: ImageStyle;
	itemAvatarPlaceholder: ViewStyle;
	itemAvatarText: TextStyle;
	channelAvatarHash: TextStyle;
	itemLeft: ViewStyle;
	itemNameRow: ViewStyle;
	itemName: TextStyle;
	itemTopic: TextStyle;
	badge: ViewStyle;
	badgeText: TextStyle;
	center: ViewStyle;
	sectionHeader: ViewStyle;
	sectionHeaderText: TextStyle;
	emptyText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	burgerBtn: {
		padding: 8,
		marginRight: 4
	},
	headerLeft: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center"
	},
	teamIcon: {
		width: 28,
		height: 28,
		borderRadius: 6,
		marginRight: 10
	},
	teamIconPlaceholder: {
		width: 28,
		height: 28,
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10
	},
	teamIconText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "bold"
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "bold",
		flex: 1
	},
	themeBtn: {
		padding: 8
	},
	searchBtn: {
		padding: 8
	},
	headerBadge: {
		borderRadius: 10,
		minWidth: 20,
		paddingHorizontal: 6,
		paddingVertical: 2,
		alignItems: "center",
		marginRight: 4
	},
	tabs: {
		flexDirection: "row",
		borderBottomWidth: 1
	},
	tab: {
		flex: 1,
		paddingVertical: 10,
		alignItems: "center"
	},
	tabActive: {
		borderBottomWidth: 2
	},
	tabContent: {
		flexDirection: "row",
		alignItems: "center"
	},
	tabText: {
		fontSize: 14,
		marginLeft: 6
	},
	tabBadge: {
		borderRadius: 9,
		minWidth: 18,
		paddingHorizontal: 5,
		paddingVertical: 1,
		alignItems: "center",
		marginLeft: 6
	},
	tabBadgeText: {
		color: "#ffffff",
		fontSize: 10,
		fontWeight: "bold"
	},
	logoutBtn: {
		paddingVertical: 10,
		paddingHorizontal: 12
	},
	headerFocused: {
		backgroundColor: "rgba(255,255,255,0.15)",
		borderRadius: 4
	},
	filter: {
		fontSize: 14,
		paddingHorizontal: 12,
		paddingVertical: 8,
		margin: 8,
		borderRadius: 4,
		borderWidth: 1
	},
	item: {
		paddingHorizontal: 16,
		paddingVertical: 10
	},
	itemInner: {
		flexDirection: "row",
		alignItems: "center"
	},
	itemAvatar: {
		width: 32,
		height: 32,
		borderRadius: 4,
		marginRight: 10,
		justifyContent: "center",
		alignItems: "center"
	},
	itemAvatarPlaceholder: {},
	itemAvatarText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "bold"
	},
	channelAvatarHash: {
		fontSize: 16,
		fontWeight: "bold"
	},
	itemLeft: {
		flex: 1
	},
	itemNameRow: {
		flexDirection: "row",
		alignItems: "center"
	},
	itemName: {
		fontSize: 15
	},
	itemTopic: {
		fontSize: 12,
		marginTop: 2
	},
	badge: {
		borderRadius: 10,
		minWidth: 20,
		paddingHorizontal: 6,
		paddingVertical: 2,
		alignItems: "center",
		marginLeft: 8
	},
	badgeText: {
		color: "#ffffff",
		fontSize: 11,
		fontWeight: "bold"
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40
	},
	sectionHeader: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		paddingTop: 16,
		borderBottomWidth: 1
	},
	sectionHeaderText: {
		fontSize: 13,
		fontWeight: "bold",
		textTransform: "uppercase"
	},
	emptyText: {
		fontSize: 14
	}
});
