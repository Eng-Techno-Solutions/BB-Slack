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
	inputBar: {
		borderTopWidth: 1
	},
	editBanner: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 6
	},
	editBannerText: {
		fontSize: 13
	},
	editCancel: {
		color: "#E01E5A",
		fontSize: 13
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		padding: 8
	},
	input: {
		flex: 1,
		fontSize: 15,
		paddingHorizontal: 12,
		paddingVertical: 9,
		borderRadius: 4,
		borderWidth: 1,
		marginRight: 8
	},
	sendBtn: {
		paddingHorizontal: 16,
		paddingVertical: 9,
		borderRadius: 4
	},
	sendDisabled: {
		opacity: 0.4
	},
	actionBtn: {
		paddingHorizontal: 6,
		paddingVertical: 9,
		marginRight: 4
	},
	micBtn: {
		paddingHorizontal: 16,
		paddingVertical: 9,
		borderRadius: 4
	},
	recordingRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center"
	},
	recordingDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		marginRight: 8
	},
	recordingText: {
		fontSize: 15,
		fontWeight: "600"
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
