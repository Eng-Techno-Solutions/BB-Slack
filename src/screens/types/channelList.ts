import type { AccountEntry, SlackChannel, UsersMap } from "../../types";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

// ChannelList screen types

export interface ChannelListSlackAPI {
	token: string;
	[key: string]: unknown;
}

export interface TabItem {
	key: string;
	label: string;
	icon: string;
}

export interface UnreadCounts {
	channelsUnread: number;
	dmsUnread: number;
	total: number;
}

export interface ChannelListProps {
	slack: ChannelListSlackAPI;
	channels: SlackChannel[];
	usersMap: UsersMap;
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

export interface ChannelListState {
	tab: string;
	filter: string;
	focusIndex: number;
	focusZone: "list" | "header";
	headerIndex: number;
	teamIconError: boolean;
	drawerOpen: boolean;
}

export interface ChannelListStyles {
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
