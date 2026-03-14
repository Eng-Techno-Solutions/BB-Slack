import { getColors, getMessageFontSize } from "../theme";
import { getTwemojiUrlByName } from "../utils/emoji";
import { EMOJI_MAP, emojiFromName } from "../utils/emoji";
import { formatTime, getUserName } from "../utils/format";
import Icon from "./Icon";
import SlackText from "./SlackText";
import React, { Component } from "react";
import {
	Dimensions,
	Image,
	Linking,
	Platform,
	StyleSheet,
	Text,
	TouchableHighlight,
	TouchableOpacity,
	View
} from "react-native";
import type { ImageSourcePropType, ImageStyle, TextStyle, ViewStyle } from "react-native";

const IS_ANDROID: boolean = Platform.OS === "android";
const SCREEN_W: number = Dimensions.get("window").width;
const CONTENT_MAX_W: number = SCREEN_W - 16 - 36 - 10 - 12 - 2;

const AVATAR_COLORS: string[] = [
	"#E8912D",
	"#2BAC76",
	"#CD2553",
	"#1264A3",
	"#9B59B6",
	"#E74C3C",
	"#00BCD4",
	"#4A154B",
	"#3498DB",
	"#E67E22",
	"#1ABC9C",
	"#8E44AD"
];

interface SlackUserProfile {
	image_72?: string;
	image_48?: string;
	[key: string]: unknown;
}

interface SlackUser {
	profile?: SlackUserProfile;
	[key: string]: unknown;
}

interface UsersMap {
	[userId: string]: SlackUser;
}

interface SlackReaction {
	name: string;
	count: number;
	users?: string[];
}

interface SlackFile {
	mimetype?: string;
	name?: string;
	title?: string;
	subtype?: string;
	url_private?: string;
	url_private_download?: string;
	thumb_480?: string;
	thumb_480_w?: number;
	thumb_480_h?: number;
	thumb_360?: string;
	thumb_360_w?: number;
	thumb_360_h?: number;
	thumb_160?: string;
	thumb_tiny?: string;
	original_w?: number;
	original_h?: number;
	permalink?: string;
	permalink_public?: string;
	filetype?: string;
	size?: number;
	aac?: string;
	duration_ms?: number;
	audio_wave_samples?: number[];
}

interface SlackMessage {
	ts: string;
	text?: string;
	user: string;
	username?: string;
	subtype?: string;
	edited?: Record<string, unknown>;
	reply_count?: number;
	reactions?: SlackReaction[];
	files?: SlackFile[];
	[key: string]: unknown;
}

interface ImagePressData {
	uri: string;
	name: string;
	token?: string;
}

interface AudioPressData {
	uri: string;
	name: string;
	duration?: number;
	token?: string;
}

interface MessageItemProps {
	message: SlackMessage;
	usersMap: UsersMap;
	currentUserId: string;
	token?: string;
	focused?: boolean;
	onLongPress?: (message: SlackMessage) => void;
	onThreadPress?: (message: SlackMessage) => void;
	onImagePress?: (data: ImagePressData) => void;
	onAudioPress?: (data: AudioPressData) => void;
	onReactionPress?: (message: SlackMessage, reactionName: string, reacted: boolean) => void;
}

interface MessageItemState {
	showReactionUsers: number | null;
}

function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash = hash & hash;
	}
	return Math.abs(hash);
}

function getAvatarColor(userId: string): string {
	return AVATAR_COLORS[hashCode(userId || "") % AVATAR_COLORS.length];
}

function getProfileImage(userId: string, usersMap: UsersMap): string | null {
	const u = usersMap[userId];
	if (u && u.profile) {
		return u.profile.image_72 || u.profile.image_48 || null;
	}
	return null;
}

function proxyUrl(url: string, token?: string): string {
	if (Platform.OS === "web" && url && token) {
		return "/slack-file?url=" + encodeURIComponent(url) + "&token=" + encodeURIComponent(token);
	}
	return url;
}

function imageSource(url: string, token?: string): ImageSourcePropType {
	if (Platform.OS !== "web" && url && token) {
		return { uri: url, headers: { Authorization: "Bearer " + token } };
	}
	return { uri: url };
}

function isImageFile(file: SlackFile): boolean {
	if (file.mimetype && file.mimetype.indexOf("image/") === 0) return true;
	const name = (file.name || file.title || "").toLowerCase();
	return name.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/) !== null;
}

function isAudioFile(file: SlackFile): boolean {
	if (file.subtype === "slack_audio") return true;
	if (file.mimetype && file.mimetype.indexOf("audio/") === 0) return true;
	return false;
}

function formatDuration(ms: number): string {
	const secs = Math.round(ms / 1000);
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return m + ":" + (s < 10 ? "0" : "") + s;
}

function isEmojiOnly(text: string): boolean {
	if (!text) return false;
	const withoutEmojis = text.replace(/:([a-zA-Z0-9_+-]+):/g, function (match: string, name: string) {
		return EMOJI_MAP[name] ? "" : match;
	});
	return withoutEmojis.trim().length === 0;
}

function _getThumbDataUri(file: SlackFile): string | null {
	if (file.thumb_tiny) {
		return "data:image/jpeg;base64," + file.thumb_tiny;
	}
	return null;
}

export default class MessageItem extends Component<MessageItemProps, MessageItemState> {
	constructor(props: MessageItemProps) {
		super(props);
		this.state = { showReactionUsers: null };
	}

	shouldComponentUpdate(nextProps: MessageItemProps, nextState: MessageItemState): boolean {
		if (this.state.showReactionUsers !== nextState.showReactionUsers) return true;
		if (this.props.focused !== nextProps.focused) return true;
		const prev = this.props.message;
		const next = nextProps.message;
		if (prev.ts !== next.ts) return true;
		if (prev.text !== next.text) return true;
		if ((prev.edited ? "y" : "n") !== (next.edited ? "y" : "n")) return true;
		if (prev.reply_count !== next.reply_count) return true;
		const prevR = prev.reactions || [];
		const nextR = next.reactions || [];
		if (prevR.length !== nextR.length) return true;
		for (let i = 0; i < prevR.length; i++) {
			if (prevR[i].name !== nextR[i].name || prevR[i].count !== nextR[i].count) return true;
		}
		const prevF = prev.files || [];
		const nextF = next.files || [];
		if (prevF.length !== nextF.length) return true;
		return false;
	}

	renderImageFile(f: SlackFile, i: number, token?: string): React.ReactNode {
		const onImagePress = this.props.onImagePress;
		const c = getColors();
		const fullUrl = f.url_private || f.url_private_download || f.thumb_480 || f.thumb_360;
		const thumbUrl = f.thumb_480 || f.thumb_360 || f.thumb_160 || fullUrl;
		const proxiedThumb = proxyUrl(thumbUrl || "", token);
		const proxiedFull = proxyUrl(fullUrl || "", token);

		let w = f.original_w || f.thumb_480_w || f.thumb_360_w || 300;
		let h = f.original_h || f.thumb_480_h || f.thumb_360_h || 200;
		const maxW = CONTENT_MAX_W;
		if (w > maxW) {
			h = Math.round(h * (maxW / w));
			w = maxW;
		}

		return (
			<TouchableOpacity
				key={i}
				style={[styles.imageWrapper, { borderColor: c.border }]}
				activeOpacity={0.8}
				data-type="file-card"
				onPress={function () {
					onImagePress &&
						onImagePress({ uri: proxiedFull, name: f.name || f.title || "Image", token: token });
				}}>
				<Image
					source={imageSource(proxiedThumb, token)}
					style={{ width: w, height: h, backgroundColor: c.bgTertiary }}
					resizeMode="cover"
				/>
			</TouchableOpacity>
		);
	}

	renderAudioFile(f: SlackFile, i: number, token?: string): React.ReactNode {
		const onAudioPress = this.props.onAudioPress;
		const c = getColors();
		const audioUrl = f.aac || f.url_private || f.url_private_download || "";
		const proxiedUrl = proxyUrl(audioUrl, token);
		const duration = f.duration_ms ? formatDuration(f.duration_ms) : "";
		const samples = f.audio_wave_samples || [];

		return (
			<TouchableOpacity
				key={i}
				style={[styles.audioCard, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
				activeOpacity={0.7}
				data-type="file-card"
				onPress={function () {
					onAudioPress &&
						onAudioPress({
							uri: proxiedUrl,
							name: f.name || f.title || "Audio",
							duration: f.duration_ms,
							token: token
						});
				}}>
				<View style={[styles.audioPlayBtn, { backgroundColor: c.green }]}>
					<Icon
						name="play"
						size={16}
						color="#FFFFFF"
					/>
				</View>
				<View style={styles.audioContent}>
					<View style={styles.waveformRow}>
						{samples
							.filter(function (_: number, idx: number) {
								return idx % 2 === 0;
							})
							.slice(0, 40)
							.map(function (val: number, idx: number) {
								const barH = Math.max(2, Math.round((val / 100) * 24));
								return (
									<View
										key={idx}
										style={[styles.waveBar, { height: barH, backgroundColor: c.accent }]}
									/>
								);
							})}
					</View>
					{duration ? (
						<Text style={[styles.audioDuration, { color: c.textTertiary }]}>{duration}</Text>
					) : null}
				</View>
			</TouchableOpacity>
		);
	}

	renderFileCard(f: SlackFile, i: number): React.ReactNode {
		const c = getColors();
		const permalink = f.permalink || f.permalink_public || "";
		const ext = (f.filetype || "").toUpperCase();
		const sizeKB = f.size
			? f.size > 1048576
				? (f.size / 1048576).toFixed(1) + " MB"
				: Math.round(f.size / 1024) + " KB"
			: "";

		return (
			<TouchableOpacity
				key={i}
				style={[styles.fileCard, { backgroundColor: c.bgTertiary, borderColor: c.border }]}
				activeOpacity={0.7}
				data-type="file-card"
				onPress={function () {
					if (permalink) {
						if (Platform.OS === "web") {
							(window as any).open(permalink, "_blank");
						} else {
							Linking.openURL(permalink).catch(function () {});
						}
					}
				}}>
				<View style={[styles.fileIcon, { backgroundColor: c.fileIconBg }]}>
					<Text style={[styles.fileIconText, { color: c.textSecondary }]}>
						{ext ? ext.substring(0, 4) : "FILE"}
					</Text>
				</View>
				<View style={styles.fileInfo}>
					<Text
						style={[styles.fileName, { color: c.accentLight }]}
						numberOfLines={1}>
						{f.name || f.title || "attachment"}
					</Text>
					<Text style={[styles.fileMeta, { color: c.textTertiary }]}>
						{ext}
						{sizeKB ? (ext ? " · " : "") + sizeKB : ""}
					</Text>
				</View>
			</TouchableOpacity>
		);
	}

	render(): React.ReactNode {
		const { message, usersMap, currentUserId, onLongPress, onThreadPress, token, focused } =
			this.props;
		const c = getColors();

		if (
			message.subtype === "channel_join" ||
			message.subtype === "channel_leave" ||
			message.subtype === "group_join" ||
			message.subtype === "group_leave"
		) {
			return (
				<View style={styles.systemMsg}>
					<View style={[styles.systemLine, { backgroundColor: c.systemLine }]} />
					<SlackText
						text={message.text || ""}
						usersMap={usersMap}
						style={[styles.systemText, { color: c.textTertiary }]}
					/>
					<View style={[styles.systemLine, { backgroundColor: c.systemLine }]} />
				</View>
			);
		}

		const userName = message.username || getUserName(message.user, usersMap);
		const time = formatTime(message.ts);
		const edited = message.edited ? " (edited)" : "";
		const threadCount = message.reply_count || 0;
		const reactions = message.reactions || [];
		const files = message.files || [];
		const profileImg = getProfileImage(message.user, usersMap);
		const initial = (userName || "?").charAt(0).toUpperCase();
		const avatarBg = getAvatarColor(message.user);
		const self = this;

		return (
			<TouchableHighlight
				style={[styles.container, focused && { backgroundColor: c.messageUnderlay }]}
				underlayColor={c.messageUnderlay}
				onPress={function () {
					onThreadPress && onThreadPress(message);
				}}
				onLongPress={function () {
					onLongPress && onLongPress(message);
				}}
				data-type="message">
				<View style={styles.msgInner}>
					<View style={styles.avatarCol}>
						{profileImg ? (
							<Image
								source={{ uri: profileImg }}
								style={styles.avatar}
							/>
						) : (
							<View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarBg }]}>
								<Text style={styles.avatarInitial}>{initial}</Text>
							</View>
						)}
					</View>
					<View style={styles.contentCol}>
						<View style={styles.headerRow}>
							<Text style={[styles.userName, { color: c.textSecondary }]}>{userName}</Text>
							<Text style={[styles.time, { color: c.textTertiary }]}>
								{time}
								{edited}
							</Text>
						</View>

						{message.text ? (
							<SlackText
								text={message.text}
								usersMap={usersMap}
								emojiOnly={isEmojiOnly(message.text)}
								style={[styles.text, { color: c.textSecondary, fontSize: getMessageFontSize() }]}
							/>
						) : null}

						{files.length > 0 ? (
							<View style={styles.filesContainer}>
								{files.map(function (f: SlackFile, i: number) {
									if (isImageFile(f)) return self.renderImageFile(f, i, token);
									if (isAudioFile(f)) return self.renderAudioFile(f, i, token);
									return self.renderFileCard(f, i);
								})}
							</View>
						) : null}

						{reactions.length > 0 ? (
							<View style={styles.reactionsRow}>
								{reactions.map(function (r: SlackReaction, i: number) {
									const emoji = emojiFromName(r.name);
									const reacted = r.users && r.users.indexOf(currentUserId) !== -1;
									const isExpanded = self.state.showReactionUsers === i;
									return (
										<View
											key={i}
											style={styles.reactionWrapper}>
											<TouchableOpacity
												style={[
													styles.reactionBadge,
													{ backgroundColor: c.bgTertiary, borderColor: c.border },
													reacted && { backgroundColor: c.reactionActiveBg, borderColor: c.accent }
												]}
												activeOpacity={0.7}
												data-type="reaction"
												onPress={function () {
													if (self.props.onReactionPress) {
														self.props.onReactionPress(message, r.name, !!reacted);
													}
												}}
												onLongPress={function () {
													self.setState({ showReactionUsers: isExpanded ? null : i });
												}}>
												{IS_ANDROID ? (
													<Image
														source={{ uri: getTwemojiUrlByName(r.name) }}
														style={styles.reactionImg}
													/>
												) : emoji ? (
													<Text style={styles.reactionEmoji}>{emoji}</Text>
												) : (
													<Text style={[styles.reactionShortcode, { color: c.textSecondary }]}>:{r.name}:</Text>
												)}
												<Text
													style={[
														styles.reactionCount,
														{ color: c.textTertiary },
														reacted && { color: c.accentLight }
													]}>
													{r.count}
												</Text>
											</TouchableOpacity>
											{isExpanded && r.users ? (
												<View
													style={[
														styles.reactionTooltip,
														{ backgroundColor: c.tooltipBg, borderColor: c.borderInput }
													]}>
													<Text style={[styles.reactionTooltipText, { color: c.textSecondary }]}>
														{r.users
															.map(function (uid: string) {
																return getUserName(uid, usersMap);
															})
															.join(", ")}
													</Text>
												</View>
											) : null}
										</View>
									);
								})}
							</View>
						) : null}

						{threadCount > 0 ? (
							<TouchableOpacity
								style={styles.threadLink}
								onPress={function () {
									onThreadPress && onThreadPress(message);
								}}
								data-type="thread-link">
								<View style={[styles.threadBar, { backgroundColor: c.accent }]} />
								<Text style={[styles.threadText, { color: c.accentLight }]}>
									{threadCount} {threadCount === 1 ? "reply" : "replies"}
								</Text>
								<Text style={[styles.threadArrow, { color: c.textTertiary }]}> View thread</Text>
							</TouchableOpacity>
						) : null}
					</View>
				</View>
			</TouchableHighlight>
		);
	}
}

const styles = StyleSheet.create({
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
