import type { ISlackAPI } from "../../api/types";
import type { SlackChannel, UsersMap } from "../../types";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

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
	slack: ISlackAPI;
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
