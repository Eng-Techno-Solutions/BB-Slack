import type { SearchStyles as Styles } from "./types";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	searchRow: {
		flexDirection: "row",
		padding: 8,
		borderBottomWidth: 1
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
	searchBtn: {
		paddingHorizontal: 16,
		paddingVertical: 9,
		borderRadius: 4,
		justifyContent: "center"
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
	item: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	itemHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 4
	},
	itemUser: {
		fontSize: 14,
		fontWeight: "bold"
	},
	itemChannel: {
		fontSize: 12
	},
	itemText: {
		fontSize: 14,
		lineHeight: 20
	},
	itemTime: {
		fontSize: 11,
		marginTop: 4
	}
});
