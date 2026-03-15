import type { ISlackAPI } from "../../api/types";
import type { SlackChannel, SlackUser, UsersMap } from "../../types";
import type { TextStyle, ViewStyle } from "react-native";

// Profile screen types

export interface ProfileProps {
	slack: ISlackAPI;
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
