import type { ImageViewerStyles } from "./types";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create<ImageViewerStyles>({
	overlay: {
		flex: 1
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1
	},
	titleArea: {
		flex: 1
	},
	fileName: {
		fontSize: 16,
		fontWeight: "700"
	},
	closeBtn: {
		width: 36,
		height: 36,
		borderRadius: 4,
		justifyContent: "center",
		alignItems: "center",
		marginLeft: 12
	},
	imageArea: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 16
	},
	imageContainer: {
		justifyContent: "center",
		alignItems: "center"
	},
	loader: {
		position: "absolute",
		zIndex: 1
	},
	errorBox: {
		padding: 24,
		borderRadius: 8,
		alignItems: "center"
	},
	errorText: {
		fontSize: 15,
		marginBottom: 12
	},
	retryBtn: {
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderRadius: 4
	},
	retryText: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600"
	},
	zoomControls: {
		position: "absolute",
		bottom: 16,
		flexDirection: "row",
		gap: 8
	},
	zoomBtn: {
		backgroundColor: "rgba(0,0,0,0.7)",
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		justifyContent: "center",
		alignItems: "center",
		marginHorizontal: 4
	},
	zoomBtnText: {
		color: "#FFFFFF",
		fontSize: 18,
		fontWeight: "700",
		includeFontPadding: false,
		textAlignVertical: "center"
	}
});
