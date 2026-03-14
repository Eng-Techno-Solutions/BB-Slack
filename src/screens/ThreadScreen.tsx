import EmojiPicker from "../components/EmojiPicker";
import Header from "../components/Header";
import Icon from "../components/Icon";
import MentionSuggest from "../components/MentionSuggest";
import MessageItem from "../components/MessageItem";
import { getColors } from "../theme";
import { cancelRecording, startRecording, stopRecording } from "../utils/audioRecorder";
import { pickFile } from "../utils/filePicker";
import { getUserName } from "../utils/format";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import { playNotification } from "../utils/notificationSound";
import React, { Component } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

interface SlackReaction {
	name: string;
	users?: string[];
	count: number;
}

interface SlackMessage {
	ts: string;
	text?: string;
	user: string;
	reactions?: SlackReaction[];
	[key: string]: unknown;
}

interface SlackUser {
	id: string;
	name?: string;
	real_name?: string;
	profile?: Record<string, unknown>;
	[key: string]: unknown;
}

interface SlackChannel {
	id: string;
	[key: string]: unknown;
}

interface SlackAPI {
	token: string;
	conversationsReplies(channelId: string, threadTs: string): Promise<{ messages?: SlackMessage[] }>;
	chatPostMessage(channelId: string, text: string, threadTs?: string): Promise<unknown>;
	reactionsAdd(channelId: string, name: string, ts: string): Promise<unknown>;
	reactionsRemove(channelId: string, name: string, ts: string): Promise<unknown>;
	filesUpload(
		channelId: string,
		file: any,
		threadTs?: string | null,
		text?: string | null
	): Promise<unknown>;
	[key: string]: unknown;
}

interface KeyEvent {
	action: string;
	[key: string]: unknown;
}

interface KeySub {
	remove(): void;
}

interface Props {
	slack: SlackAPI;
	channel: SlackChannel;
	parentMessage: SlackMessage;
	usersMap: Record<string, SlackUser>;
	currentUserId: string;
	onBack?: () => void;
	themeMode?: string;
}

interface State {
	replies: SlackMessage[];
	loading: boolean;
	inputText: string;
	sending: boolean;
	emojiPickerMode: string | null;
	actionMessage: SlackMessage | null;
	reactionTarget: SlackMessage | null;
	uploading: boolean;
	recording: boolean;
	recordingTime: number;
	focusIndex: number;
}

export default class ThreadScreen extends Component<Props, State> {
	_mounted: boolean;
	_pollTimer: ReturnType<typeof setInterval> | null;
	_recordTimer: ReturnType<typeof setInterval> | null;
	_keySub: KeySub | null;
	_list: FlatList<SlackMessage> | null;
	_inputRef: TextInput | null;
	_mentionRef: any;
	_keyExtractor: (item: SlackMessage) => string;
	_renderItem: (obj: { item: SlackMessage; index: number }) => React.ReactElement;
	_onReactionPress: (m: SlackMessage, name: string, reacted: boolean) => void;
	_onLongPress: (m: SlackMessage) => void;
	_listRef: (r: FlatList<SlackMessage> | null) => void;

	constructor(props: Props) {
		super(props);
		this.state = {
			replies: [],
			loading: true,
			inputText: "",
			sending: false,
			emojiPickerMode: null,
			actionMessage: null,
			reactionTarget: null,
			uploading: false,
			recording: false,
			recordingTime: 0,
			focusIndex: -1
		};
		this._mounted = false;
		this._pollTimer = null;
		this._recordTimer = null;
		this._keySub = null;
		this._list = null;
		this._inputRef = null;
		this._mentionRef = null;
		const self = this;
		this._keyExtractor = function (item: SlackMessage) {
			return item.ts;
		};
		this._renderItem = function (obj: { item: SlackMessage; index: number }) {
			return self._renderMessageItem(obj);
		};
		this._onReactionPress = function (m: SlackMessage, name: string, reacted: boolean) {
			self.toggleReaction(m, name, reacted);
		};
		this._onLongPress = function (m: SlackMessage) {
			self.setState({ reactionTarget: m, emojiPickerMode: "reaction" });
		};
		this._listRef = function (r: FlatList<SlackMessage> | null) {
			self._list = r;
		};
	}

	componentDidMount(): void {
		this._mounted = true;
		this.loadReplies();
		this.startPolling();
		const self = this;
		this._keySub = addKeyEventListener(function (e: KeyEvent) {
			self.handleKeyEvent(e);
		});
	}

	componentWillUnmount(): void {
		this._mounted = false;
		this.stopPolling();
		removeKeyEventListener(this._keySub);
		if (this._recordTimer) {
			clearInterval(this._recordTimer);
		}
		if (this.state.recording) {
			cancelRecording();
		}
	}

	handleKeyEvent(e: KeyEvent): void {
		const action = e.action;
		const replies = this.state.replies;
		const idx = this.state.focusIndex;

		if (this._mentionRef && this._mentionRef.isVisible()) {
			if (this._mentionRef.handleKeyEvent(action)) return;
		}

		if (action === "down") {
			if (replies.length === 0) return;
			const next = idx < 0 ? 0 : Math.min(idx + 1, replies.length - 1);
			this.setState({ focusIndex: next });
			if (this._list)
				try {
					this._list.scrollToIndex({ index: next, viewOffset: 80, animated: true });
				} catch (_e) {}
		} else if (action === "up") {
			if (replies.length === 0) return;
			const prev = idx <= 0 ? 0 : idx - 1;
			this.setState({ focusIndex: prev });
			if (this._list)
				try {
					this._list.scrollToIndex({ index: prev, viewOffset: 80, animated: true });
				} catch (_e) {}
		} else if (action === "select" && idx >= 0 && idx < replies.length) {
			this.setState({ reactionTarget: replies[idx], emojiPickerMode: "reaction" });
		} else if (action === "back") {
			this.props.onBack && this.props.onBack();
		}
	}

	startPolling(): void {
		const self = this;
		this._pollTimer = setInterval(function () {
			if (self._mounted) self.pollReplies();
		}, 10000);
	}

	stopPolling(): void {
		if (this._pollTimer) {
			clearInterval(this._pollTimer);
			this._pollTimer = null;
		}
	}

	async loadReplies(): Promise<void> {
		const { slack, channel, parentMessage } = this.props;
		try {
			const res = await slack.conversationsReplies(channel.id, parentMessage.ts);
			this.setState({ replies: (res.messages || []).slice().reverse(), loading: false });
		} catch (err: any) {
			this.setState({ loading: false });
			Alert.alert("Error", err.message);
		}
	}

	async pollReplies(): Promise<void> {
		const { slack, channel, parentMessage, currentUserId } = this.props;
		const { loading, replies } = this.state;
		if (loading) return;
		try {
			const res = await slack.conversationsReplies(channel.id, parentMessage.ts);
			const newReplies = (res.messages || []).slice().reverse();
			if (newReplies.length > replies.length) {
				const newOnes = newReplies.slice(0, newReplies.length - replies.length);
				const fromOthers = newOnes.filter(function (m: SlackMessage) {
					return m.user !== currentUserId;
				});
				if (fromOthers.length > 0) {
					playNotification();
				}
			}
			let changed = newReplies.length !== replies.length;
			if (!changed) {
				for (let i = 0; i < newReplies.length; i++) {
					if (
						newReplies[i].ts !== replies[i].ts ||
						newReplies[i].text !== replies[i].text ||
						(newReplies[i].reactions || []).length !== (replies[i].reactions || []).length
					) {
						changed = true;
						break;
					}
				}
			}
			if (changed) this.setState({ replies: newReplies });
		} catch (err) {
			// Silent
		}
	}

	async sendReply(): Promise<void> {
		const { slack, channel, parentMessage } = this.props;
		const { inputText } = this.state;
		const text = inputText.trim();
		if (!text) return;

		this.setState({ sending: true });
		try {
			await slack.chatPostMessage(channel.id, text, parentMessage.ts);
			this.setState({ inputText: "", sending: false });
			if (this._inputRef) this._inputRef.clear();
			this.loadReplies();
		} catch (err: any) {
			this.setState({ sending: false });
			Alert.alert("Error", err.message);
		}
	}

	async handleAttachment(): Promise<void> {
		const { slack, channel, parentMessage } = this.props;
		try {
			const file = await pickFile();
			if (!file) return;
			this.setState({ uploading: true });
			const text = this.state.inputText.trim();
			await slack.filesUpload(channel.id, file, parentMessage.ts, text || null);
			this.setState({ uploading: false, inputText: "" });
			if (this._inputRef) this._inputRef.clear();
			this.loadReplies();
		} catch (err: any) {
			this.setState({ uploading: false });
			Alert.alert("Error", err.message);
		}
	}

	async handleStartRecording(): Promise<void> {
		const self = this;
		try {
			await startRecording();
			this.setState({ recording: true, recordingTime: 0 });
			this._recordTimer = setInterval(function () {
				if (self._mounted) {
					self.setState(function (prev: State) {
						return { recordingTime: prev.recordingTime + 1 };
					});
				}
			}, 1000);
		} catch (err: any) {
			Alert.alert("Error", "Could not start recording: " + err.message);
		}
	}

	async handleStopRecording(): Promise<void> {
		const { slack, channel, parentMessage } = this.props;
		if (this._recordTimer) {
			clearInterval(this._recordTimer);
			this._recordTimer = null;
		}
		try {
			const audio = await stopRecording();
			this.setState({ recording: false, recordingTime: 0, uploading: true });
			await slack.filesUpload(channel.id, audio, parentMessage.ts);
			this.setState({ uploading: false });
			this.loadReplies();
		} catch (err: any) {
			this.setState({ recording: false, recordingTime: 0, uploading: false });
			Alert.alert("Error", err.message);
		}
	}

	async handleCancelRecording(): Promise<void> {
		if (this._recordTimer) {
			clearInterval(this._recordTimer);
			this._recordTimer = null;
		}
		await cancelRecording();
		this.setState({ recording: false, recordingTime: 0 });
	}

	async addReaction(message: SlackMessage, name: string): Promise<void> {
		const { slack, channel } = this.props;
		try {
			await slack.reactionsAdd(channel.id, name, message.ts);
			this.setState({ reactionTarget: null });
			this.pollReplies();
		} catch (err: any) {
			Alert.alert("Error", err.message);
		}
	}

	async removeReaction(message: SlackMessage, name: string): Promise<void> {
		const { slack, channel } = this.props;
		try {
			await slack.reactionsRemove(channel.id, name, message.ts);
			this.pollReplies();
		} catch (err: any) {
			Alert.alert("Error", err.message);
		}
	}

	async toggleReaction(message: SlackMessage, name: string, alreadyReacted: boolean): Promise<void> {
		if (alreadyReacted) {
			await this.removeReaction(message, name);
		} else {
			await this.addReaction(message, name);
		}
	}

	_renderMessageItem(obj: { item: SlackMessage; index: number }): React.ReactElement {
		return (
			<MessageItem
				message={obj.item}
				usersMap={this.props.usersMap}
				currentUserId={this.props.currentUserId}
				token={this.props.slack.token}
				focused={obj.index === this.state.focusIndex}
				onLongPress={this._onLongPress}
				onReactionPress={this._onReactionPress}
			/>
		);
	}

	onMentionSelect(userId: string, _displayName: string): void {
		this.setState(function (prev: State) {
			const text = prev.inputText;
			const at = text.lastIndexOf("@");
			const before = text.substring(0, at);
			return { inputText: before + "<@" + userId + "> " };
		});
	}

	onEmojiSelect(name: string, emoji: string): void {
		const mode = this.state.emojiPickerMode;
		if (mode === "reaction") {
			this.addReaction(this.state.reactionTarget!, name);
		} else if (mode === "input") {
			this.setState(function (prev: State) {
				return { inputText: prev.inputText + emoji };
			});
		}
		this.setState({ emojiPickerMode: null });
	}

	render(): React.ReactElement {
		const {
			slack: _slack,
			usersMap,
			currentUserId: _currentUserId,
			onBack,
			parentMessage
		} = this.props;
		const { replies, loading, inputText, sending } = this.state;
		const self = this;
		const parentUser = getUserName(parentMessage.user, usersMap);
		const c = getColors();

		return (
			<View style={[styles.container, { backgroundColor: c.bg }]}>
				<Header
					title="Thread"
					subtitle={"Started by " + parentUser}
					onBack={onBack}
				/>

				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator
							size="large"
							color={c.accent}
						/>
					</View>
				) : (
					<FlatList
						ref={this._listRef}
						data={replies}
						inverted
						keyExtractor={this._keyExtractor}
						renderItem={this._renderItem}
						removeClippedSubviews={true}
						maxToRenderPerBatch={8}
						windowSize={7}
						initialNumToRender={12}
					/>
				)}

				<MentionSuggest
					ref={function (r: any) {
						self._mentionRef = r;
					}}
					text={inputText}
					usersMap={usersMap}
					onSelect={function (id: string, name: string) {
						self.onMentionSelect(id, name);
					}}
				/>
				<View style={[styles.inputRow, { borderTopColor: c.border, backgroundColor: c.bg }]}>
					{self.state.recording ? (
						<View style={styles.innerRow}>
							<View style={styles.recordingRow}>
								<View style={[styles.recordingDot, { backgroundColor: "#E01E5A" }]} />
								<Text style={[styles.recordingText, { color: c.textSecondary }]}>
									{Math.floor(self.state.recordingTime / 60) +
										":" +
										(self.state.recordingTime % 60 < 10 ? "0" : "") +
										(self.state.recordingTime % 60)}
								</Text>
							</View>
							<TouchableOpacity
								style={styles.actionBtn}
								onPress={function () {
									self.handleCancelRecording();
								}}
								data-type="icon-btn">
								<Icon
									name="close"
									size={20}
									color="#E01E5A"
								/>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.sendBtn, { backgroundColor: c.green }]}
								onPress={function () {
									self.handleStopRecording();
								}}
								data-type="btn">
								<Icon
									name="send"
									size={18}
									color="#ffffff"
								/>
							</TouchableOpacity>
						</View>
					) : (
						<View style={styles.innerRow}>
							<TouchableOpacity
								style={styles.actionBtn}
								onPress={function () {
									self.handleAttachment();
								}}
								disabled={self.state.uploading || sending}
								data-type="icon-btn">
								<Icon
									name="paperclip"
									size={22}
									color={c.textTertiary}
								/>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.actionBtn}
								onPress={function () {
									self.setState({ emojiPickerMode: "input" });
								}}
								data-type="icon-btn">
								<Icon
									name="smile"
									size={22}
									color={c.textTertiary}
								/>
							</TouchableOpacity>
							<TextInput
								ref={function (r: TextInput | null) {
									self._inputRef = r;
								}}
								style={[
									styles.input,
									{ backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: c.borderInput }
								]}
								placeholder="Reply..."
								placeholderTextColor={c.textPlaceholder}
								value={inputText}
								onChangeText={function (t: string) {
									self.setState({ inputText: t });
								}}
								onSubmitEditing={function () {
									self.sendReply();
								}}
								returnKeyType="send"
								autoFocus={true}
							/>
							{inputText.trim() ? (
								<TouchableOpacity
									style={[
										styles.sendBtn,
										{ backgroundColor: c.green },
										(sending || self.state.uploading) && styles.sendDisabled
									]}
									onPress={function () {
										self.sendReply();
									}}
									disabled={sending || self.state.uploading}
									data-type="btn">
									{sending || self.state.uploading ? (
										<ActivityIndicator
											size="small"
											color="#ffffff"
										/>
									) : (
										<Icon
											name="send"
											size={18}
											color="#ffffff"
										/>
									)}
								</TouchableOpacity>
							) : (
								<TouchableOpacity
									style={[
										styles.micBtn,
										{ backgroundColor: c.green },
										self.state.uploading && styles.sendDisabled
									]}
									onPress={function () {
										self.handleStartRecording();
									}}
									disabled={self.state.uploading}
									data-type="btn">
									{self.state.uploading ? (
										<ActivityIndicator
											size="small"
											color="#ffffff"
										/>
									) : (
										<Icon
											name="mic"
											size={18}
											color="#ffffff"
										/>
									)}
								</TouchableOpacity>
							)}
						</View>
					)}
				</View>

				<EmojiPicker
					visible={!!self.state.emojiPickerMode}
					onSelect={function (name: string, emoji: string) {
						self.onEmojiSelect(name, emoji);
					}}
					onClose={function () {
						self.setState({ emojiPickerMode: null });
					}}
				/>
			</View>
		);
	}
}

interface Styles {
	container: ViewStyle;
	center: ViewStyle;
	inputRow: ViewStyle;
	innerRow: ViewStyle;
	input: TextStyle;
	sendBtn: ViewStyle;
	sendDisabled: ViewStyle;
	actionBtn: ViewStyle;
	micBtn: ViewStyle;
	recordingRow: ViewStyle;
	recordingDot: ViewStyle;
	recordingText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
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
