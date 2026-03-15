import type { AudioPlayerStyles } from "./types";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<AudioPlayerStyles>({
	overlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24
	},
	card: {
		borderRadius: 12,
		width: "100%",
		maxWidth: 400,
		overflow: "hidden"
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	title: {
		flex: 1,
		fontSize: 15,
		fontWeight: "600"
	},
	closeBtn: {
		width: 32,
		height: 32,
		borderRadius: 4,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: 12
	},
	playerArea: {
		padding: 20
	},
	controlsRow: {
		flexDirection: "row",
		alignItems: "center"
	},
	playBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12
	},
	sliderArea: {
		flex: 1
	},
	progressTrack: {
		height: 4,
		borderRadius: 2,
		flexDirection: "row",
		overflow: "hidden"
	},
	progressFill: {},
	timeRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 6
	},
	timeText: {
		fontSize: 11
	},
	errorText: {
		fontSize: 14,
		textAlign: "center",
		marginBottom: 12
	},
	retryBtn: {
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 4,
		alignSelf: "center"
	},
	retryText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600"
	}
});
