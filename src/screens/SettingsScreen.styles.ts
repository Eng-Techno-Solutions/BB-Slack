import type { SettingsStyles as Styles } from "./types";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "bold",
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 8
	},
	row: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1
	},
	rowInner: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between"
	},
	rowLeft: {
		flexDirection: "row",
		alignItems: "center"
	},
	rowLabel: {
		fontSize: 15,
		marginLeft: 12
	},
	rowValue: {
		fontSize: 14
	},
	toggle: {
		width: 44,
		height: 24,
		borderRadius: 12,
		padding: 2,
		justifyContent: "center"
	},
	toggleKnob: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: "#FFFFFF"
	},
	toggleKnobOn: {
		alignSelf: "flex-end"
	},
	hint: {
		fontSize: 12,
		paddingHorizontal: 16,
		paddingTop: 8,
		lineHeight: 16
	},
	devBio: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1
	},
	bioText: {
		fontSize: 13,
		lineHeight: 18
	},
	bottomPad: {
		height: 40
	}
});
