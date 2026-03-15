import type { ChannelListStyles as Styles } from "./types";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	burgerBtn: {
		padding: 8,
		marginRight: 4
	},
	headerLeft: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center"
	},
	teamIcon: {
		width: 28,
		height: 28,
		borderRadius: 6,
		marginRight: 10
	},
	teamIconPlaceholder: {
		width: 28,
		height: 28,
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10
	},
	teamIconText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "bold"
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "bold",
		flex: 1
	},
	themeBtn: {
		padding: 8
	},
	searchBtn: {
		padding: 8
	},
	headerBadge: {
		borderRadius: 10,
		minWidth: 20,
		paddingHorizontal: 6,
		paddingVertical: 2,
		alignItems: "center",
		marginRight: 4
	},
	tabs: {
		flexDirection: "row",
		borderBottomWidth: 1
	},
	tab: {
		flex: 1,
		paddingVertical: 10,
		alignItems: "center"
	},
	tabActive: {
		borderBottomWidth: 2
	},
	tabContent: {
		flexDirection: "row",
		alignItems: "center"
	},
	tabText: {
		fontSize: 14,
		marginLeft: 6
	},
	tabBadge: {
		borderRadius: 9,
		minWidth: 18,
		paddingHorizontal: 5,
		paddingVertical: 1,
		alignItems: "center",
		marginLeft: 6
	},
	tabBadgeText: {
		color: "#ffffff",
		fontSize: 10,
		fontWeight: "bold"
	},
	logoutBtn: {
		paddingVertical: 10,
		paddingHorizontal: 12
	},
	headerFocused: {
		backgroundColor: "rgba(255,255,255,0.15)",
		borderRadius: 4
	},
	filter: {
		fontSize: 14,
		paddingHorizontal: 12,
		paddingVertical: 8,
		margin: 8,
		borderRadius: 4,
		borderWidth: 1
	},
	item: {
		paddingHorizontal: 16,
		paddingVertical: 10
	},
	itemInner: {
		flexDirection: "row",
		alignItems: "center"
	},
	itemAvatar: {
		width: 32,
		height: 32,
		borderRadius: 4,
		marginRight: 10,
		justifyContent: "center",
		alignItems: "center"
	},
	itemAvatarPlaceholder: {},
	itemAvatarText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "bold"
	},
	channelAvatarHash: {
		fontSize: 16,
		fontWeight: "bold"
	},
	itemLeft: {
		flex: 1
	},
	itemNameRow: {
		flexDirection: "row",
		alignItems: "center"
	},
	itemName: {
		fontSize: 15
	},
	itemTopic: {
		fontSize: 12,
		marginTop: 2
	},
	badge: {
		borderRadius: 10,
		minWidth: 20,
		paddingHorizontal: 6,
		paddingVertical: 2,
		alignItems: "center",
		marginLeft: 8
	},
	badgeText: {
		color: "#ffffff",
		fontSize: 11,
		fontWeight: "bold"
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 40
	},
	sectionHeader: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		paddingTop: 16,
		borderBottomWidth: 1
	},
	sectionHeaderText: {
		fontSize: 13,
		fontWeight: "bold",
		textTransform: "uppercase"
	},
	emptyText: {
		fontSize: 14
	}
});
