import type { SlackChannel, SlackMessage, UsersMap } from "../../types";
import type { TextStyle, ViewStyle } from "react-native";

// Thread screen types

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
