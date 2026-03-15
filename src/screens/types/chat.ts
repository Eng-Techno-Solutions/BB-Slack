import type { SlackChannel, SlackMessage, UsersMap } from "../../types";
import type { TextStyle, ViewStyle } from "react-native";

// Chat screen types

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

export interface ChatStyles {
	container: ViewStyle;
	listWrapper: ViewStyle;
	center: ViewStyle;
	emptyText: TextStyle;
	loadMore: ViewStyle;
	loadMoreText: TextStyle;
	scrollBtn: ViewStyle;
	unseenBadge: ViewStyle;
	unseenBadgeText: TextStyle;
}
