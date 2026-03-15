import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

export interface WorkspaceAccount {
	userId: string;
	teamName?: string;
	teamIcon?: string;
	userName?: string;
}

export interface WorkspaceDrawerProps {
	visible: boolean;
	accounts: WorkspaceAccount[];
	activeAccountId: string;
	onSwitch: (account: WorkspaceAccount) => void;
	onAddAccount: () => void;
	onRemoveAccount: (account: WorkspaceAccount) => void;
	onClose: () => void;
}

export interface WorkspaceDrawerStyles {
	container: ViewStyle;
	overlay: ViewStyle;
	overlayTouch: ViewStyle;
	drawer: ViewStyle;
	drawerHeader: ViewStyle;
	drawerTitle: TextStyle;
	accountsList: ViewStyle;
	accountItem: ViewStyle;
	accountInner: ViewStyle;
	accountIcon: ImageStyle;
	accountIconPlaceholder: ViewStyle;
	accountIconText: TextStyle;
	accountInfo: ViewStyle;
	accountTeam: TextStyle;
	accountUser: TextStyle;
	removeBtn: ViewStyle;
	addBtn: ViewStyle;
	addBtnInner: ViewStyle;
	addIconWrap: ViewStyle;
	addBtnText: TextStyle;
}
