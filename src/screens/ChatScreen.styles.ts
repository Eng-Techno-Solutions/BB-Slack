import type { ChatStyles as Styles } from "./types";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	listWrapper: {
		flex: 1
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40
	},
	emptyText: {
		fontSize: 14
	},
	loadMore: {
		padding: 12,
		alignItems: "center"
	},
	loadMoreText: {
		fontSize: 14
	},
	scrollBtn: {
		position: "absolute",
		right: 16,
		bottom: 12,
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 10,
		elevation: 5
	},
	unseenBadge: {
		position: "absolute",
		top: -8,
		right: -4,
		borderRadius: 10,
		minWidth: 20,
		paddingHorizontal: 5,
		paddingVertical: 2,
		alignItems: "center",
		zIndex: 11
	},
	unseenBadgeText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "bold"
	}
});
