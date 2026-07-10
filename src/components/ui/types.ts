import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

export interface EmojiEntry {
	name: string;
	emoji: string;
	url: string | null;
}

export interface EmojiPickerProps {
	visible: boolean;
	onSelect: (name: string, emoji: string) => void;
	onClose: () => void;
}

export interface EmojiPickerState {
	search: string;
}

export interface EmojiPickerStyles {
	overlay: ViewStyle;
	backdrop: ViewStyle;
	container: ViewStyle;
	header: ViewStyle;
	title: TextStyle;
	closeBtn: TextStyle;
	search: TextStyle;
	emojiBtn: ViewStyle;
	emojiText: TextStyle;
	emojiImg: ImageStyle;
}

export interface ActionSheetAction {
	label: string;
	onPress: () => void;
	destructive?: boolean;
}

export interface ActionSheetProps {
	visible: boolean;
	actions: ActionSheetAction[];
	onClose: () => void;
}

export interface ActionSheetStyles {
	overlay: ViewStyle;
	sheet: ViewStyle;
	action: ViewStyle;
	actionText: TextStyle;
	cancelBtn: ViewStyle;
	cancelText: TextStyle;
}

export interface HeaderProps {
	title: string;
	subtitle?: string;
	onBack?: () => void;
	rightLabel?: string;
	rightIcon?: string;
	onRight?: () => void;
}

export interface HeaderStyles {
	header: ViewStyle;
	left: ViewStyle;
	center: ViewStyle;
	right: ViewStyle;
	backBtn: ViewStyle;
	title: TextStyle;
	subtitle: TextStyle;
	rightBtn: ViewStyle;
	rightText: TextStyle;
}

export interface IconProps {
	name: string;
	size?: number;
	color?: string;
	style?: object;
}

export interface NotificationBannerProps {
	title: string;
	body: string;
	onPress: () => void;
	onDismiss: () => void;
}

export interface NotificationBannerStyles {
	wrap: ViewStyle;
	banner: ViewStyle;
	title: TextStyle;
	body: TextStyle;
	close: ViewStyle;
	closeText: TextStyle;
}

export interface GlobalUnreadBadgeProps {
	count: number;
	onPress: () => void;
}

export interface GlobalUnreadBadgeStyles {
	wrap: ViewStyle;
	count: ViewStyle;
	countText: TextStyle;
}
