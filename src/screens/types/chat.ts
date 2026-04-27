import type { ISlackAPI } from "../../api/types";
import type { SlackChannel, SlackMessage, UsersMap } from "../../types";
import type { TextStyle, ViewStyle } from "react-native";

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
	slack: ISlackAPI;
	channel: SlackChannel;
	usersMap: UsersMap;
	currentUserId: string;
	onBack?: () => void;
	onThread: (msg: SlackMessage) => void;
	onMembers?: () => void;
	themeMode?: string;
	rtmConnected?: boolean;
	onRegisterRTMHandler?: (channelId: string, handler: () => void) => void;
	onUnregisterRTMHandler?: (channelId: string) => void;
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
