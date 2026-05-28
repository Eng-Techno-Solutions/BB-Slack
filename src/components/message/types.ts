import type { SlackFile, SlackMessage, SlackReaction, UsersMap } from "../../types";
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from "react-native";

export interface ImagePressData {
	uri: string;
	name: string;
	token?: string;
}

export interface AudioPressData {
	uri: string;
	name: string;
	duration?: number;
	token?: string;
}

export interface MessageItemProps {
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

export interface MessageItemState {
	showReactionUsers: number | null;
}

export interface AvatarProps {
	userId: string;
	userName: string;
	usersMap: UsersMap;
	size?: number;
}

export interface FileRendererProps {
	files: SlackFile[];
	token?: string;
	onImagePress?: (data: ImagePressData) => void;
	onAudioPress?: (data: AudioPressData) => void;
}

export interface ReactionRowProps {
	reactions: SlackReaction[];
	currentUserId: string;
	usersMap: UsersMap;
	onReactionPress?: (reactionName: string, reacted: boolean) => void;
}

export interface ReactionRowState {
	showReactionUsers: number | null;
}

export interface TextPart {
	type: string;
	value?: string;
	url?: string;
	label?: string;
	children?: TextPart[];
}

export interface TokenizedResult {
	text: string;
	tokens: string[];
}

export interface SlackTextProps {
	text: string;
	usersMap?: UsersMap;
	style?: StyleProp<TextStyle>;
	numberOfLines?: number;
	emojiOnly?: boolean;
}

export interface SlackTextStyles {
	link: TextStyle;
	mention: TextStyle;
	channel: TextStyle;
	inlineCode: TextStyle;
	codeBlock: ViewStyle;
	codeBlockText: TextStyle;
	bold: TextStyle;
	italic: TextStyle;
	strike: TextStyle;
	inlineEmoji: ImageStyle;
	bigEmoji: ImageStyle;
	emojiOnlyText: TextStyle;
}

export interface FilteredUser {
	id: string;
	name: string;
	display: string;
}

export interface MentionSuggestProps {
	text: string;
	usersMap: UsersMap;
	onSelect: (userId: string, userName: string) => void;
}

export interface MentionSuggestState {
	focusIndex: number;
}

export interface MentionSuggestStyles {
	container: ViewStyle;
	item: ViewStyle;
	itemInner: ViewStyle;
	avatarWrap: ViewStyle;
	name: TextStyle;
	display: TextStyle;
}

export interface ImageViewerProps {
	visible: boolean;
	source: string;
	fileName?: string;
	token?: string;
	onClose: () => void;
}

export interface ImageViewerState {
	loading: boolean;
	error: boolean;
	scale: number;
	translateX: number;
	translateY: number;
	dragging: boolean;
}

export interface MousePosition {
	x: number;
	y: number;
}

export interface WheelLikeEvent {
	deltaY: number;
	preventDefault: () => void;
}

export interface MouseLikeEvent {
	clientX: number;
	clientY: number;
	preventDefault: () => void;
}

export interface WindowDimensions {
	width: number;
	height: number;
}

export interface ImageViewerStyles {
	overlay: ViewStyle;
	topBar: ViewStyle;
	titleArea: ViewStyle;
	fileName: TextStyle;
	closeBtn: ViewStyle;
	imageArea: ViewStyle;
	imageContainer: ViewStyle;
	loader: ViewStyle;
	errorBox: ViewStyle;
	errorText: TextStyle;
	retryBtn: ViewStyle;
	retryText: TextStyle;
	zoomControls: ViewStyle;
	zoomBtn: ViewStyle;
	zoomBtnText: TextStyle;
}

export interface NativeSoundInstance {
	getDuration(): number;
	getCurrentTime(cb: (sec: number) => void): void;
	setCurrentTime(val: number): void;
	play(cb: (success: boolean) => void): void;
	pause(): void;
	stop(): void;
	release(): void;
}

export interface NativeSoundConstructor {
	new (url: string, basePath: string | null, cb: (err: Error | null) => void): NativeSoundInstance;
}

export interface AudioPlayerProps {
	visible: boolean;
	source: string;
	fileName?: string;
	token?: string;
	onClose?: () => void;
}

export interface AudioPlayerState {
	playing: boolean;
	duration: number;
	position: number;
	error: string | null;
}

export interface AudioPlayerStyles {
	overlay: ViewStyle;
	card: ViewStyle;
	header: ViewStyle;
	title: TextStyle;
	closeBtn: ViewStyle;
	playerArea: ViewStyle;
	controlsRow: ViewStyle;
	playBtn: ViewStyle;
	sliderArea: ViewStyle;
	progressTrack: ViewStyle;
	progressFill: ViewStyle;
	timeRow: ViewStyle;
	timeText: TextStyle;
	errorText: TextStyle;
	retryBtn: ViewStyle;
	retryText: TextStyle;
}
