import type { ChannelInfoStyles as Styles } from "./types";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	infoSection: {
		padding: 16,
		borderBottomWidth: 1
	},
	channelName: {
		fontSize: 20,
		fontWeight: "bold",
		marginBottom: 4
	},
	purpose: {
		fontSize: 14,
		marginBottom: 4
	},
	topic: {
		fontSize: 13,
		marginBottom: 4
	},
	memberCount: {
		fontSize: 13,
		marginTop: 4
	},
	tabRow: {
		flexDirection: "row",
		borderBottomWidth: 1
	},
	tabBtn: {
		flex: 1,
		paddingVertical: 10,
		alignItems: "center"
	},
	tabBtnActive: {
		borderBottomWidth: 2
	},
	tabBtnText: {
		fontSize: 14
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
	memberItem: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	memberInner: {
		flexDirection: "row",
		alignItems: "center"
	},
	memberAvatar: {
		width: 32,
		height: 32,
		borderRadius: 4,
		marginRight: 10
	},
	memberAvatarPlaceholder: {
		justifyContent: "center",
		alignItems: "center"
	},
	memberAvatarText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "bold"
	},
	memberName: {
		flex: 1,
		fontSize: 15
	},
	pinItem: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	pinUser: {
		fontSize: 14,
		fontWeight: "bold",
		marginBottom: 2
	},
	pinText: {
		fontSize: 14
	}
});
