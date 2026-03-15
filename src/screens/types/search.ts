import type { ISlackAPI } from "../../api/types";
import type { UsersMap } from "../../types";
import type { TextStyle, ViewStyle } from "react-native";

// Search screen types

export interface SearchMatch {
	ts: string;
	text: string;
	user?: string;
	username?: string;
	channel?: { id: string; name: string };
	[key: string]: unknown;
}

export interface SearchProps {
	slack: ISlackAPI;
	usersMap: UsersMap;
	onBack?: () => void;
	onSelectMessage?: (msg: SearchMatch) => void;
	themeMode?: string;
}

export interface SearchState {
	query: string;
	results: SearchMatch[];
	loading: boolean;
	searched: boolean;
	focusIndex: number;
}

export interface SearchStyles {
	container: ViewStyle;
	searchRow: ViewStyle;
	input: TextStyle;
	searchBtn: ViewStyle;
	center: ViewStyle;
	emptyText: TextStyle;
	item: ViewStyle;
	itemHeader: ViewStyle;
	itemUser: TextStyle;
	itemChannel: TextStyle;
	itemText: TextStyle;
	itemTime: TextStyle;
}
