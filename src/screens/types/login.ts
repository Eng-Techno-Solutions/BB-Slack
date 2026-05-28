import type { TextStyle, ViewStyle } from "react-native";

// Login screen types

export interface FocusableRef {
	focus?: () => void;
	measure?: (
		callback: (fx: number, fy: number, w: number, h: number, px: number, py: number) => void
	) => void;
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
