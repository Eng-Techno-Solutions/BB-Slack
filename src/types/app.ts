import type { ISlackAPI } from "../api/types";
import type { AccountEntry, SlackChannel, SlackUser, StackEntry } from "./index";
import type { ViewStyle } from "react-native";

export interface AppProps {}

export interface AppState {
	initializing: boolean;
	slack: ISlackAPI | null;
	currentUser: string | null;
	teamName: string;
	teamIcon: string;
	usersMap: Record<string, SlackUser>;
	channels: SlackChannel[];
	channelsLoading: boolean;
	channelsError: string | null;
	stack: StackEntry[];
	themeMode: string;
	notifInterval: number;
	notifEnabled: boolean;
	soundEnabled: boolean;
	fontSize: string;
	accounts: AccountEntry[];
	rtmConnected: boolean;
}

export interface AppStyles {
	app: ViewStyle;
	splash: ViewStyle;
}
