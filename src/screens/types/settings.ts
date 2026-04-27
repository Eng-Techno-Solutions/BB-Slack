import type { TextStyle, ViewStyle } from "react-native";

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
	rtmConnected?: boolean;
}

export interface SettingsState {
	focusIndex: number;
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
