import type { ThreadStyles as Styles } from "./types";
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
	inputRow: {
		padding: 8,
		borderTopWidth: 1
	},
	innerRow: {
		flexDirection: "row",
		alignItems: "center"
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
	}
});
