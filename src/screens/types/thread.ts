import type { ISlackAPI } from "../../api/types";
import type { SlackChannel, SlackMessage, UsersMap } from "../../types";
import type { ViewStyle } from "react-native";

// Thread screen types

export interface ThreadProps {
	slack: ISlackAPI;
	channel: SlackChannel;
	parentMessage: SlackMessage;
	usersMap: UsersMap;
	currentUserId: string;
	onBack?: () => void;
	themeMode?: string;
	rtmConnected?: boolean;
	onRegisterRTMHandler?: (channelId: string, handler: () => void) => void;
	onUnregisterRTMHandler?: (channelId: string) => void;
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
}
