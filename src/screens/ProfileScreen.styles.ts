import type { ProfileStyles as Styles } from "./types";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	center: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center"
	},
	errorText: {
		color: "#E01E5A",
		fontSize: 14
	},
	profileSection: {
		alignItems: "center",
		padding: 24,
		borderBottomWidth: 1
	},
	avatar: {
		width: 72,
		height: 72,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 12
	},
	avatarText: {
		color: "#ffffff",
		fontSize: 30,
		fontWeight: "bold"
	},
	displayName: {
		fontSize: 22,
		fontWeight: "bold"
	},
	realName: {
		fontSize: 15,
		marginTop: 2
	},
	title: {
		fontSize: 14,
		marginTop: 4
	},
	status: {
		fontSize: 14,
		marginTop: 4
	},
	botBadge: {
		fontSize: 11,
		fontWeight: "bold",
		marginTop: 6,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		overflow: "hidden"
	},
	detailsSection: {
		padding: 16
	},
	detailRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	detailLabel: {
		fontSize: 14
	},
	detailValue: {
		fontSize: 14
	},
	dmButton: {
		margin: 16,
		paddingVertical: 14,
		borderRadius: 4,
		alignItems: "center"
	},
	dmButtonText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "bold"
	}
});
