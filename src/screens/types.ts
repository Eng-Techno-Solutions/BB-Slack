import type { AccountEntry, SlackChannel, SlackMessage, SlackUser, UsersMap } from "../types";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

// Slack API interfaces per screen (structural typing for what each screen needs)

export interface ChatScreenSlackAPI {
	token: string;
	conversationsHistory(
		channelId: string,
		cursor: string | null,
		limit: number
	): Promise<{ messages?: SlackMessage[]; response_metadata?: { next_cursor?: string } }>;
	conversationsMark(channelId: string, ts: string): Promise<unknown>;
	chatPostMessage(channelId: string, text: string, threadTs?: string): Promise<unknown>;
	chatUpdate(channelId: string, ts: string, text: string): Promise<unknown>;
	chatDelete(channelId: string, ts: string): Promise<unknown>;
	reactionsAdd(channelId: string, name: string, ts: string): Promise<unknown>;
	reactionsRemove(channelId: string, name: string, ts: string): Promise<unknown>;
	filesUpload(
		channelId: string,
		file: any,
		threadTs?: string | null,
		text?: string | null
	): Promise<unknown>;
	[key: string]: unknown;
}

export interface ThreadScreenSlackAPI {
	token: string;
	conversationsReplies(channelId: string, threadTs: string): Promise<{ messages?: SlackMessage[] }>;
	chatPostMessage(channelId: string, text: string, threadTs?: string): Promise<unknown>;
	reactionsAdd(channelId: string, name: string, ts: string): Promise<unknown>;
	reactionsRemove(channelId: string, name: string, ts: string): Promise<unknown>;
	filesUpload(
		channelId: string,
		file: any,
		threadTs?: string | null,
		text?: string | null
	): Promise<unknown>;
	[key: string]: unknown;
}

export interface ChannelListSlackAPI {
	token: string;
	[key: string]: unknown;
}

export interface SearchScreenSlackAPI {
	searchMessages(query: string): Promise<{ messages?: { matches?: SearchMatch[] } }>;
	[key: string]: unknown;
}

export interface ChannelInfoSlackAPI {
	token: string;
	conversationsMembers(channelId: string): Promise<{ members?: string[] }>;
	pinsList(channelId: string): Promise<{ items?: PinItem[] }>;
	[key: string]: unknown;
}

export interface ProfileScreenSlackAPI {
	usersInfo(userId: string): Promise<{ user: SlackUser }>;
	conversationsOpen(userId: string): Promise<{ channel: SlackChannel }>;
	[key: string]: unknown;
}

// Login screen types

export interface SigninResponse {
	ok: boolean;
	token?: string;
	error?: string;
}

export type FieldName =
	| "emailTab"
	| "tokenTab"
	| "workspace"
	| "email"
	| "password"
	| "signin"
	| "pin"
	| "verify"
	| "pinBack"
	| "token"
	| "openApps";

export interface LoginProps {
	onLogin: (token: string) => Promise<void>;
	onBack?: (() => void) | null;
	themeMode?: string;
}

export interface LoginState {
	mode: "email" | "token";
	workspace: string;
	email: string;
	password: string;
	needsPin: boolean;
	pin: string;
	_teamId: string;
	token: string;
	loading: boolean;
	error: string | null;
	focusIndex: number;
}

// ChannelList screen types

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

// Chat screen types

export interface ViewerImage {
	uri: string;
	name: string;
	token?: string;
}

export interface ViewerAudio {
	uri: string;
	name: string;
	duration?: number;
	token?: string;
}

export interface ChatActionItem {
	label: string;
	destructive?: boolean;
	onPress: () => void;
}

export interface ChatProps {
	slack: ChatScreenSlackAPI;
	channel: SlackChannel;
	usersMap: UsersMap;
	currentUserId: string;
	onBack?: () => void;
	onThread: (msg: SlackMessage) => void;
	onMembers?: () => void;
	themeMode?: string;
}

export interface ChatState {
	messages: SlackMessage[];
	loading: boolean;
	loadingMore: boolean;
	inputText: string;
	sending: boolean;
	cursor: string | null;
	hasMore: boolean;
	actionMessage: SlackMessage | null;
	editingMessage: SlackMessage | null;
	viewerImage: ViewerImage | null;
	viewerAudio: ViewerAudio | null;
	emojiPickerMode: string | null;
	reactionTarget: SlackMessage | null;
	showScrollBtn: boolean;
	uploading: boolean;
	recording: boolean;
	recordingTime: number;
	focusIndex: number;
	_unseenTick?: number;
}

// Thread screen types

export interface ThreadProps {
	slack: ThreadScreenSlackAPI;
	channel: SlackChannel;
	parentMessage: SlackMessage;
	usersMap: UsersMap;
	currentUserId: string;
	onBack?: () => void;
	themeMode?: string;
}

export interface ThreadState {
	replies: SlackMessage[];
	loading: boolean;
	inputText: string;
	sending: boolean;
	emojiPickerMode: string | null;
	actionMessage: SlackMessage | null;
	reactionTarget: SlackMessage | null;
	uploading: boolean;
	recording: boolean;
	recordingTime: number;
	focusIndex: number;
}

// Search screen types

export interface SearchMatch {
	ts: string;
	text: string;
	user?: string;
	username?: string;
	channel?: { id: string; name: string };
	[key: string]: unknown;
}

export interface SearchProps {
	slack: SearchScreenSlackAPI;
	usersMap: UsersMap;
	onBack?: () => void;
	onSelectMessage?: (msg: SearchMatch) => void;
	themeMode?: string;
}

export interface SearchState {
	query: string;
	results: SearchMatch[];
	loading: boolean;
	searched: boolean;
	focusIndex: number;
}

// ChannelInfo screen types

export interface PinMessage {
	user: string;
	text: string;
	ts: string;
	[key: string]: unknown;
}

export interface PinItem {
	message?: PinMessage;
	[key: string]: unknown;
}

export interface ChannelInfoProps {
	slack: ChannelInfoSlackAPI;
	channel: SlackChannel;
	usersMap: UsersMap;
	currentUserId: string;
	onBack?: () => void;
	onProfile?: (userId: string) => void;
	themeMode?: string;
}

export interface ChannelInfoState {
	members: string[];
	loading: boolean;
	pins: PinItem[];
	pinsLoading: boolean;
	showPins: boolean;
	focusIndex: number;
}

// Settings screen types

export interface IntervalOption {
	label: string;
	value: number;
}

export interface FontSizeOption {
	label: string;
	value: string;
}

export interface SettingsActionItem {
	type: string;
	action: () => void;
}

export interface SettingsProps {
	notifEnabled: boolean;
	notifInterval: number;
	soundEnabled: boolean;
	fontSize: string;
	onToggleNotif: () => void;
	onChangeInterval: (value: number) => void;
	onToggleSound: () => void;
	onToggleTheme: () => void;
	onChangeFontSize: (value: string) => void;
	onBack: () => void;
	themeMode?: string;
}

export interface SettingsState {
	focusIndex: number;
}

// Profile screen types

export interface ProfileProps {
	slack: ProfileScreenSlackAPI;
	userId: string;
	usersMap: UsersMap;
	currentUserId: string;
	onBack?: () => void;
	onOpenDM?: (channel: SlackChannel) => void;
	themeMode?: string;
}

export interface ProfileState {
	user: SlackUser | null;
	loading: boolean;
}

// Screen Styles

export interface LoginStyles {
	container: ViewStyle;
	backBtn: ViewStyle;
	backBtnInner: ViewStyle;
	backBtnText: TextStyle;
	logo: TextStyle;
	subtitle: TextStyle;
	tabs: ViewStyle;
	tab: ViewStyle;
	tabText: TextStyle;
	form: ViewStyle;
	label: TextStyle;
	workspaceRow: ViewStyle;
	workspaceInput: ViewStyle;
	workspaceSuffix: TextStyle;
	input: TextStyle;
	button: ViewStyle;
	buttonDisabled: ViewStyle;
	buttonFocused: ViewStyle;
	buttonText: TextStyle;
	hint: TextStyle;
	instructions: ViewStyle;
	instructionsTitle: TextStyle;
	step: TextStyle;
	linkButton: ViewStyle;
	linkButtonText: TextStyle;
	error: TextStyle;
	footer: TextStyle;
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

export interface ChatStyles {
	container: ViewStyle;
	listWrapper: ViewStyle;
	center: ViewStyle;
	emptyText: TextStyle;
	loadMore: ViewStyle;
	loadMoreText: TextStyle;
	inputBar: ViewStyle;
	editBanner: ViewStyle;
	editBannerText: TextStyle;
	editCancel: TextStyle;
	inputRow: ViewStyle;
	input: TextStyle;
	sendBtn: ViewStyle;
	sendDisabled: ViewStyle;
	actionBtn: ViewStyle;
	micBtn: ViewStyle;
	recordingRow: ViewStyle;
	recordingDot: ViewStyle;
	recordingText: TextStyle;
	scrollBtn: ViewStyle;
	unseenBadge: ViewStyle;
	unseenBadgeText: TextStyle;
}

export interface ThreadStyles {
	container: ViewStyle;
	center: ViewStyle;
	inputRow: ViewStyle;
	innerRow: ViewStyle;
	input: TextStyle;
	sendBtn: ViewStyle;
	sendDisabled: ViewStyle;
	actionBtn: ViewStyle;
	micBtn: ViewStyle;
	recordingRow: ViewStyle;
	recordingDot: ViewStyle;
	recordingText: TextStyle;
}

export interface SearchStyles {
	container: ViewStyle;
	searchRow: ViewStyle;
	input: TextStyle;
	searchBtn: ViewStyle;
	center: ViewStyle;
	emptyText: TextStyle;
	item: ViewStyle;
	itemHeader: ViewStyle;
	itemUser: TextStyle;
	itemChannel: TextStyle;
	itemText: TextStyle;
	itemTime: TextStyle;
}

export interface ChannelInfoStyles {
	container: ViewStyle;
	infoSection: ViewStyle;
	channelName: TextStyle;
	purpose: TextStyle;
	topic: TextStyle;
	memberCount: TextStyle;
	tabRow: ViewStyle;
	tabBtn: ViewStyle;
	tabBtnActive: ViewStyle;
	tabBtnText: TextStyle;
	center: ViewStyle;
	emptyText: TextStyle;
	memberItem: ViewStyle;
	memberInner: ViewStyle;
	memberAvatar: ImageStyle;
	memberAvatarPlaceholder: ViewStyle;
	memberAvatarText: TextStyle;
	memberName: TextStyle;
	pinItem: ViewStyle;
	pinUser: TextStyle;
	pinText: TextStyle;
}

export interface SettingsStyles {
	container: ViewStyle;
	sectionTitle: TextStyle;
	row: ViewStyle;
	rowInner: ViewStyle;
	rowLeft: ViewStyle;
	rowLabel: TextStyle;
	rowValue: TextStyle;
	toggle: ViewStyle;
	toggleKnob: ViewStyle;
	toggleKnobOn: ViewStyle;
	hint: TextStyle;
	devBio: ViewStyle;
	bioText: TextStyle;
	bottomPad: ViewStyle;
}

export interface ProfileStyles {
	container: ViewStyle;
	center: ViewStyle;
	errorText: TextStyle;
	profileSection: ViewStyle;
	avatar: ViewStyle;
	avatarText: TextStyle;
	displayName: TextStyle;
	realName: TextStyle;
	title: TextStyle;
	status: TextStyle;
	botBadge: TextStyle;
	detailsSection: ViewStyle;
	detailRow: ViewStyle;
	detailLabel: TextStyle;
	detailValue: TextStyle;
	dmButton: ViewStyle;
	dmButtonText: TextStyle;
}
