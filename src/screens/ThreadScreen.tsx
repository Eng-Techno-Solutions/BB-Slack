import { EmojiPicker, Header, InputBar, MentionSuggest, MessageItem } from "../components";
import { hasMessagesChanged } from "../services/messageService";
import { toggleReaction as toggleReactionService } from "../services/reactionService";
import { getColors } from "../theme";
import type { KeyEvent, KeySub, SlackMessage } from "../types";
import { cancelRecording, startRecording, stopRecording } from "../utils/audioRecorder";
import { getChatPollInterval } from "../utils/constants";
import { errorMessage } from "../utils/error";
import { pickFile } from "../utils/filePicker";
import { getUserName } from "../utils/format";
import { addKeyEventListener, removeKeyEventListener } from "../utils/keyEvents";
import { safeScrollToIndex } from "../utils/listScroll";
import { playNotification } from "../utils/notificationSound";
import { styles } from "./ThreadScreen.styles";
import type { ThreadProps as Props, ThreadState as State } from "./types";
import React, { Component } from "react";
import type { TextInput } from "react-native";
import { ActivityIndicator, Alert, FlatList, View } from "react-native";

export default class ThreadScreen extends Component<Props, State> {
	_mounted: boolean;
	_pollTimer: ReturnType<typeof setInterval> | null;
	_recordTimer: ReturnType<typeof setInterval> | null;
	_keySub: KeySub | null;
	_list: FlatList<SlackMessage> | null;
	_inputRef: TextInput | null;
	_mentionRef: MentionSuggest | null;
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
		if (this.props.onRegisterRTMHandler) {
			this.props.onRegisterRTMHandler(this.props.channel.id, function () {
				self.pollReplies();
			});
		}
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
		if (this.props.onUnregisterRTMHandler) {
			this.props.onUnregisterRTMHandler(this.props.channel.id);
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
			safeScrollToIndex(this._list, next);
		} else if (action === "up") {
			if (replies.length === 0) return;
			const prev = idx <= 0 ? 0 : idx - 1;
			this.setState({ focusIndex: prev });
			safeScrollToIndex(this._list, prev);
		} else if (action === "select" && idx >= 0 && idx < replies.length) {
			this.setState({ reactionTarget: replies[idx], emojiPickerMode: "reaction" });
		} else if (action === "back") {
			this.props.onBack && this.props.onBack();
		}
	}

	startPolling(): void {
		const self = this;
		const interval = getChatPollInterval(this.props.rtmConnected);
		this._pollTimer = setInterval(function () {
			if (self._mounted) self.pollReplies();
		}, interval);
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
			this.setState({
				replies: ((res.messages as SlackMessage[]) || []).slice().reverse(),
				loading: false
			});
		} catch (err: unknown) {
			this.setState({ loading: false });
			Alert.alert("Error", errorMessage(err, "Failed to load thread"));
		}
	}

	async pollReplies(): Promise<void> {
		const { slack, channel, parentMessage, currentUserId } = this.props;
		const { loading, replies } = this.state;
		if (loading) return;
		try {
			const res = await slack.conversationsReplies(channel.id, parentMessage.ts);
			const newReplies = ((res.messages as SlackMessage[]) || []).slice().reverse();
			if (newReplies.length > replies.length) {
				const newOnes = newReplies.slice(0, newReplies.length - replies.length);
				const fromOthers = newOnes.filter(function (m: SlackMessage) {
					return m.user !== currentUserId;
				});
				if (fromOthers.length > 0) {
					playNotification();
				}
			}
			if (hasMessagesChanged(replies, newReplies)) {
				this.setState({ replies: newReplies });
			}
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
		} catch (err: unknown) {
			this.setState({ sending: false });
			Alert.alert("Error", errorMessage(err, "Failed to send"));
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
		} catch (err: unknown) {
			this.setState({ uploading: false });
			Alert.alert("Error", errorMessage(err, "Upload failed"));
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
		} catch (err: unknown) {
			Alert.alert("Error", "Could not start recording: " + errorMessage(err, "unknown error"));
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
		} catch (err: unknown) {
			this.setState({ recording: false, recordingTime: 0, uploading: false });
			Alert.alert("Error", errorMessage(err, "Recording failed"));
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

	async toggleReaction(message: SlackMessage, name: string, alreadyReacted: boolean): Promise<void> {
		const { slack, channel } = this.props;
		try {
			await toggleReactionService(slack, channel.id, message.ts, name, alreadyReacted);
			if (!alreadyReacted) {
				this.setState({ reactionTarget: null });
			}
			this.pollReplies();
		} catch (err: unknown) {
			Alert.alert("Error", errorMessage(err, "Reaction failed"));
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
			this.toggleReaction(this.state.reactionTarget!, name, false);
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
					ref={function (r: MentionSuggest | null) {
						self._mentionRef = r;
					}}
					text={inputText}
					usersMap={usersMap}
					onSelect={function (id: string, name: string) {
						self.onMentionSelect(id, name);
					}}
				/>
				<InputBar
					inputText={inputText}
					onChangeText={function (t: string) {
						self.setState({ inputText: t });
					}}
					onSubmit={function () {
						self.sendReply();
					}}
					onAttachment={function () {
						self.handleAttachment();
					}}
					onEmojiPress={function () {
						self.setState({ emojiPickerMode: "input" });
					}}
					sending={sending}
					uploading={self.state.uploading}
					recording={self.state.recording}
					recordingTime={self.state.recordingTime}
					onStartRecording={function () {
						self.handleStartRecording();
					}}
					onStopRecording={function () {
						self.handleStopRecording();
					}}
					onCancelRecording={function () {
						self.handleCancelRecording();
					}}
					placeholder="Reply..."
					autoFocus={true}
					inputRef={function (r: TextInput | null) {
						self._inputRef = r;
					}}
				/>

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
