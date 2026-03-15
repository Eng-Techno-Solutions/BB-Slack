export type ScreenName =
	| "login"
	| "channelList"
	| "chat"
	| "thread"
	| "search"
	| "channelInfo"
	| "settings"
	| "profile";

export interface StackEntry {
	screen: string;
	params: Record<string, any>;
}

export interface AccountEntry {
	token: string;
	teamName: string;
	teamId: string;
	userId: string;
	userName: string;
	teamIcon: string;
}
