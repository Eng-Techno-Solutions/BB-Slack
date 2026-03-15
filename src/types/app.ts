import type { AccountEntry, SlackChannel, SlackUser, StackEntry } from "./index";
import type { ViewStyle } from "react-native";

export interface AppProps {}

export interface AppState {
	initializing: boolean;
	slack: any;
	currentUser: string | null;
	teamName: string;
	teamIcon: string;
	usersMap: Record<string, SlackUser>;
	channels: SlackChannel[];
	channelsLoading: boolean;
	stack: StackEntry[];
	themeMode: string;
	notifInterval: number;
	notifEnabled: boolean;
	soundEnabled: boolean;
	fontSize: string;
	accounts: AccountEntry[];
}

export interface AppStyles {
	app: ViewStyle;
	splash: ViewStyle;
}
