import { Dimensions, StyleSheet } from "react-native";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

const SCREEN_W: number = Dimensions.get("window").width;
export const CONTENT_MAX_W: number = SCREEN_W - 16 - 36 - 10 - 12 - 2;

export const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		paddingRight: 12
	} as ViewStyle,
	msgInner: {
		flexDirection: "row"
	} as ViewStyle,
	avatarCol: { width: 36, marginRight: 10, paddingTop: 2 } as ViewStyle,
	avatar: { width: 36, height: 36, borderRadius: 4 } as ImageStyle,
	avatarFallback: { justifyContent: "center", alignItems: "center" } as ViewStyle,
	avatarInitial: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" } as TextStyle,
	contentCol: { flex: 1 } as ViewStyle,
	headerRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 2 } as ViewStyle,
	userName: { fontSize: 15, fontWeight: "bold", marginRight: 8 } as TextStyle,
	time: { fontSize: 12 } as TextStyle,
	text: { fontSize: 15, lineHeight: 22 } as TextStyle,

	systemMsg: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 8
	} as ViewStyle,
	systemLine: { flex: 1, height: 1 } as ViewStyle,
	systemText: { fontSize: 13, paddingHorizontal: 12 } as TextStyle,

	filesContainer: { marginTop: 6 } as ViewStyle,

	imageWrapper: {
		marginBottom: 6,
		borderRadius: 8,
		overflow: "hidden",
		alignSelf: "flex-start",
		borderWidth: 1
	} as ViewStyle,

	audioCard: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 8,
		borderWidth: 1,
		padding: 10,
		marginBottom: 6,
		alignSelf: "flex-start",
		minWidth: 240,
		maxWidth: CONTENT_MAX_W
	} as ViewStyle,
	audioPlayBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10
	} as ViewStyle,
	audioContent: { flex: 1 } as ViewStyle,
	waveformRow: { flexDirection: "row", alignItems: "center", height: 28 } as ViewStyle,
	waveBar: { width: 3, borderRadius: 1, marginRight: 1 } as ViewStyle,
	audioDuration: { fontSize: 11, marginTop: 4 } as TextStyle,

	fileCard: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 8,
		borderWidth: 1,
		padding: 10,
		marginBottom: 6,
		alignSelf: "flex-start",
		minWidth: 200,
		maxWidth: CONTENT_MAX_W
	} as ViewStyle,
	fileIcon: {
		width: 40,
		height: 40,
		borderRadius: 6,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10
	} as ViewStyle,
	fileIconText: { fontSize: 10, fontWeight: "bold" } as TextStyle,
	fileInfo: { flex: 1 } as ViewStyle,
	fileName: { fontSize: 14, fontWeight: "600" } as TextStyle,
	fileMeta: { fontSize: 12, marginTop: 2 } as TextStyle,

	reactionsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 } as ViewStyle,
	reactionWrapper: { position: "relative" } as ViewStyle,
	reactionBadge: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: 16,
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginRight: 4,
		marginBottom: 4,
		borderWidth: 1
	} as ViewStyle,
	reactionEmoji: { fontSize: 16, marginRight: 4 } as TextStyle,
	reactionImg: { width: 18, height: 18, marginRight: 4 } as ImageStyle,
	reactionShortcode: { fontSize: 12, marginRight: 4 } as TextStyle,
	reactionCount: { fontSize: 12, fontWeight: "600" } as TextStyle,
	reactionTooltip: {
		position: "absolute",
		bottom: "100%",
		left: 0,
		borderRadius: 6,
		borderWidth: 1,
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginBottom: 4,
		minWidth: 80,
		zIndex: 10
	} as ViewStyle,
	reactionTooltipText: {
		fontSize: 12
	} as TextStyle,

	threadLink: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 6,
		paddingVertical: 4
	} as ViewStyle,
	threadBar: { width: 2, height: 16, borderRadius: 1, marginRight: 8 } as ViewStyle,
	threadText: { fontSize: 13, fontWeight: "600" } as TextStyle,
	threadArrow: { fontSize: 12 } as TextStyle
});
