import ActionSheet from "../components/ActionSheet";
import AudioPlayer from "../components/AudioPlayer";
import EmojiPicker from "../components/EmojiPicker";
import Header from "../components/Header";
import Icon from "../components/Icon";
import ImageViewer from "../components/ImageViewer";
import MentionSuggest from "../components/MentionSuggest";
import MessageItem from "../components/MessageItem";
import { getColors } from "../theme";
import { cancelRecording, startRecording, stopRecording } from "../utils/audioRecorder";
import { pickFile } from "../utils/filePicker";
import { getChannelDisplayName } from "../utils/format";
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
import type { NativeScrollEvent, NativeSyntheticEvent, TextStyle, ViewStyle } from "react-native";

interface SlackReaction {
	name: string;
	users?: string[];
	count: number;
}

interface SlackMessage {
	ts: string;
	text?: string;
	user: string;
	username?: string;
	reply_count?: number;
	reactions?: SlackReaction[];
	edited?: Record<string, unknown>;
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
	is_im?: boolean;
	topic?: { value: string };
	[key: string]: unknown;
}

interface SlackAPI {
	token: string;
	conversationsHistory(
		channelId: string,
		cursor: string | null,
		limit: number
	): Promise<{ messages?: SlackMessage[]; response_metadata?: { next_cursor?: string } }>;
	conversationsMark(channelId: string, ts: string): Promise<unknown>;
	chatPostMessage(channelId: string, text: string, threadTs?: string): Promise<unknown>;
	chatUpdate(channelId: string, ts: string, text: string): Promise<unknown>;
	chatDelete(channelId: string, ts: string): Promise<unknown>;
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

interface ViewerImage {
	uri: string;
	name: string;
	token?: string;
}

interface ViewerAudio {
	uri: string;
	name: string;
	duration?: number;
	token?: string;
}

interface ActionItem {
	label: string;
	destructive?: boolean;
	onPress: () => void;
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
	usersMap: Record<string, SlackUser>;
	currentUserId: string;
	onBack?: () => void;
	onThread: (msg: SlackMessage) => void;
	onMembers?: () => void;
	themeMode?: string;
}

interface State {
	messages: SlackMessage[];
	loading: boolean;
	loadingMore: boolean;
	inputText: string;
	sending: boolean;
	cursor: string | null;
	hasMore: boolean;
	actionMessage: SlackMessage | null;
	editingMessage: SlackMessage | null;
	viewerImage: ViewerImage | null;
	viewerAudio: ViewerAudio | null;
	emojiPickerMode: string | null;
	reactionTarget: SlackMessage | null;
	showScrollBtn: boolean;
	uploading: boolean;
	recording: boolean;
	recordingTime: number;
	focusIndex: number;
	_unseenTick?: number;
}

export default class ChatScreen extends Component<Props, State> {
	_mounted: boolean;
	_userScrolledUp: boolean;
	_unseenCount: number;
	_polling: boolean;
	_pollTimer: ReturnType<typeof setInterval> | null;
	_recordTimer: ReturnType<typeof setInterval> | null;
	_keySub: KeySub | null;
	_list: FlatList<SlackMessage> | null;
	_inputRef: TextInput | null;
	_mentionRef: any;
	_onLongPress: (m: SlackMessage) => void;
	_onReactionPress: (m: SlackMessage, name: string, reacted: boolean) => void;
	_onImagePress: (img: ViewerImage) => void;
	_onAudioPress: (audio: ViewerAudio) => void;
	_renderItem: (obj: { item: SlackMessage; index: number }) => React.ReactElement;
	_keyExtractor: (item: SlackMessage) => string;
	_onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
	_listRef: (r: FlatList<SlackMessage> | null) => void;

	constructor(props: Props) {
		super(props);
		this.state = {
			messages: [],
			loading: true,
			loadingMore: false,
			inputText: "",
			sending: false,
			cursor: null,
			hasMore: true,
			actionMessage: null,
			editingMessage: null,
			viewerImage: null,
			viewerAudio: null,
			emojiPickerMode: null,
			reactionTarget: null,
			showScrollBtn: false,
			uploading: false,
			recording: false,
			recordingTime: 0,
			focusIndex: -1
		};
		this._mounted = false;
		this._userScrolledUp = false;
		this._unseenCount = 0;
		this._polling = false;
		this._pollTimer = null;
		this._recordTimer = null;
		this._keySub = null;
		this._list = null;
		this._inputRef = null;
		this._mentionRef = null;
		const self = this;
		this._onLongPress = function (m: SlackMessage) {
			self.onMessageLongPress(m);
		};
		this._onReactionPress = function (m: SlackMessage, name: string, reacted: boolean) {
			self.toggleReaction(m, name, reacted);
		};
		this._onImagePress = function (img: ViewerImage) {
			self.setState({ viewerImage: img });
		};
		this._onAudioPress = function (audio: ViewerAudio) {
			self.setState({ viewerAudio: audio });
		};
		this._renderItem = function (obj: { item: SlackMessage; index: number }) {
			return self._renderMessageItem(obj);
		};
		this._keyExtractor = function (item: SlackMessage) {
			return item.ts;
		};
		this._onScroll = function (e: NativeSyntheticEvent<NativeScrollEvent>) {
			self._handleScroll(e);
		};
		this._listRef = function (r: FlatList<SlackMessage> | null) {
			self._list = r;
		};
	}

	componentDidMount(): void {
		this._mounted = true;
		this._userScrolledUp = false;
		this.loadMessages();
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
		const msgs = this.state.messages;
		const idx = this.state.focusIndex;

		if (this._mentionRef && this._mentionRef.isVisible()) {
			if (this._mentionRef.handleKeyEvent(action)) return;
		}

		if (action === "down") {
			if (msgs.length === 0) return;
			const next = idx <= 0 ? 0 : idx - 1;
			this.setState({ focusIndex: next });
			if (this._list)
				try {
					this._list.scrollToIndex({ index: next, viewOffset: 80, animated: true });
				} catch (_e) {}
		} else if (action === "up") {
			if (msgs.length === 0) return;
			const prev = idx < 0 ? 0 : Math.min(idx + 1, msgs.length - 1);
			this.setState({ focusIndex: prev });
			if (this._list)
				try {
					this._list.scrollToIndex({ index: prev, viewOffset: 80, animated: true });
				} catch (_e) {}
		} else if (action === "select" && idx >= 0 && idx < msgs.length) {
			this.onMessageLongPress(msgs[idx]);
		} else if (action === "back") {
			this.props.onBack && this.props.onBack();
		}
	}

	startPolling(): void {
		const self = this;
		this._pollTimer = setInterval(function () {
			if (self._mounted) self.pollNewMessages();
		}, 10000);
	}

	stopPolling(): void {
		if (this._pollTimer) {
			clearInterval(this._pollTimer);
			this._pollTimer = null;
		}
	}

	async loadMessages(): Promise<void> {
		const { slack, channel } = this.props;
		try {
			const res = await slack.conversationsHistory(channel.id, null, 30);
			const msgs = (res.messages || []).slice();
			const cursor = res.response_metadata && res.response_metadata.next_cursor;
			this.setState({
				messages: msgs,
				loading: false,
				cursor: cursor || null,
				hasMore: !!cursor
			});
			this.markRead(msgs);
		} catch (err: any) {
			this.setState({ loading: false });
			Alert.alert("Error", err.message);
		}
	}

	async pollNewMessages(): Promise<void> {
		const { slack, channel } = this.props;
		const { messages, loading } = this.state;
		if (loading || this._polling) return;
		this._polling = true;
		try {
			const limit = Math.min(Math.max(messages.length, 30), 100);
			const res = await slack.conversationsHistory(channel.id, null, limit);
			const fetched = (res.messages || []).slice();
			if (fetched.length === 0) return;

			const existingMap: Record<string, boolean> = {};
			for (let i = 0; i < messages.length; i++) {
				existingMap[messages[i].ts] = true;
			}

			let hasNew = false;
			for (let j = 0; j < fetched.length; j++) {
				if (!existingMap[fetched[j].ts]) {
					hasNew = true;
					break;
				}
			}

			const fetchedMap: Record<string, SlackMessage> = {};
			for (let k = 0; k < fetched.length; k++) {
				fetchedMap[fetched[k].ts] = fetched[k];
			}

			const merged: SlackMessage[] = [];
			for (let n = 0; n < fetched.length; n++) {
				if (!existingMap[fetched[n].ts]) {
					merged.push(fetched[n]);
				}
			}
			for (let m = 0; m < messages.length; m++) {
				if (fetchedMap[messages[m].ts]) {
					merged.push(fetchedMap[messages[m].ts]);
				} else {
					merged.push(messages[m]);
				}
			}

			const self = this;
			const currentUserId = this.props.currentUserId;
			let changed = merged.length !== messages.length;
			if (!changed) {
				for (let c = 0; c < merged.length; c++) {
					if (
						merged[c].ts !== messages[c].ts ||
						merged[c].text !== messages[c].text ||
						(merged[c].reactions || []).length !== (messages[c].reactions || []).length ||
						merged[c].reply_count !== messages[c].reply_count
					) {
						changed = true;
						break;
					}
				}
			}
			if (changed) this.setState({ messages: merged });
			if (hasNew) {
				const newMsgs = fetched.filter(function (f: SlackMessage) {
					return !existingMap[f.ts];
				});
				const fromOthers = newMsgs.filter(function (msg: SlackMessage) {
					return msg.user !== currentUserId;
				});
				if (fromOthers.length > 0) {
					playNotification();
				}
				if (!self._userScrolledUp) {
					this.markRead(newMsgs);
				} else {
					self._unseenCount = (self._unseenCount || 0) + newMsgs.length;
					self.setState({ _unseenTick: Date.now() });
				}
			}
		} catch (err) {
			// Silent fail on poll
		}
		this._polling = false;
	}

	async loadMore(): Promise<void> {
		const { slack, channel } = this.props;
		const { cursor, loadingMore, hasMore } = this.state;
		if (loadingMore || !hasMore || !cursor) return;

		this.setState({ loadingMore: true });
		try {
			const res = await slack.conversationsHistory(channel.id, cursor, 30);
			const older = (res.messages || []).slice();
			const nextCursor = res.response_metadata && res.response_metadata.next_cursor;
			this.setState(function (prev: State) {
				return {
					messages: prev.messages.concat(older),
					loadingMore: false,
					cursor: nextCursor || null,
					hasMore: !!nextCursor
				};
			});
		} catch (err) {
			this.setState({ loadingMore: false });
		}
	}

	markRead(msgs: SlackMessage[]): void {
		const { slack, channel } = this.props;
		if (msgs.length > 0) {
			const lastTs = msgs[0].ts;
			slack.conversationsMark(channel.id, lastTs).catch(function () {});
		}
	}

	async sendMessage(): Promise<void> {
		const { slack, channel } = this.props;
		const { inputText, editingMessage } = this.state;
		const text = inputText.trim();
		if (!text) return;

		this.setState({ sending: true });
		try {
			if (editingMessage) {
				await slack.chatUpdate(channel.id, editingMessage.ts, text);
				this.setState(function (prev: State) {
					const updated = prev.messages.map(function (m: SlackMessage) {
						if (m.ts === editingMessage.ts) {
							return Object.assign({}, m, { text: text, edited: { user: "", ts: "" } });
						}
						return m;
					});
					return {
						messages: updated,
						inputText: "",
						sending: false,
						editingMessage: null
					} as Partial<State>;
				} as any);
				if (this._inputRef) this._inputRef.clear();
			} else {
				await slack.chatPostMessage(channel.id, text);
				this.setState({ inputText: "", sending: false });
				if (this._inputRef) this._inputRef.clear();
				this.pollNewMessages();
			}
		} catch (err: any) {
			this.setState({ sending: false });
			Alert.alert("Error", err.message);
		}
	}

	async handleAttachment(): Promise<void> {
		const { slack, channel } = this.props;
		try {
			const file = await pickFile();
			if (!file) return;
			this.setState({ uploading: true });
			const text = this.state.inputText.trim();
			await slack.filesUpload(channel.id, file, null, text || null);
			this.setState({ uploading: false, inputText: "" });
			if (this._inputRef) this._inputRef.clear();
			this.pollNewMessages();
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
		const { slack, channel } = this.props;
		if (this._recordTimer) {
			clearInterval(this._recordTimer);
			this._recordTimer = null;
		}
		try {
			const audio = await stopRecording();
			this.setState({ recording: false, recordingTime: 0, uploading: true });
			await slack.filesUpload(channel.id, audio);
			this.setState({ uploading: false });
			this.pollNewMessages();
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

	async deleteMessage(message: SlackMessage): Promise<void> {
		const { slack, channel } = this.props;
		try {
			await slack.chatDelete(channel.id, message.ts);
			this.setState(function (prev: State) {
				return {
					messages: prev.messages.filter(function (m: SlackMessage) {
						return m.ts !== message.ts;
					}),
					actionMessage: null as SlackMessage | null
				} as Pick<State, "messages" | "actionMessage">;
			});
		} catch (err: any) {
			Alert.alert("Error", err.message);
		}
	}

	async addReaction(message: SlackMessage, name: string): Promise<void> {
		const { slack, channel } = this.props;
		try {
			await slack.reactionsAdd(channel.id, name, message.ts);
			this.setState({ actionMessage: null });
			this.pollNewMessages();
		} catch (err: any) {
			Alert.alert("Error", err.message);
		}
	}

	async removeReaction(message: SlackMessage, name: string): Promise<void> {
		const { slack, channel } = this.props;
		try {
			await slack.reactionsRemove(channel.id, name, message.ts);
			this.pollNewMessages();
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
				onThreadPress={this.props.onThread}
				onImagePress={this._onImagePress}
				onAudioPress={this._onAudioPress}
			/>
		);
	}

	_handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>): void {
		const offset = e.nativeEvent.contentOffset.y;
		const nearBottom = offset < 150;
		this._userScrolledUp = !nearBottom;
		if (nearBottom && this._unseenCount > 0) {
			this._unseenCount = 0;
			this.markRead(this.state.messages);
		}
		if (this.state.showScrollBtn !== !nearBottom) {
			this.setState({ showScrollBtn: !nearBottom });
		}
	}

	onMessageLongPress(message: SlackMessage): void {
		this.setState({ actionMessage: message, reactionTarget: message });
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

	getActions(): ActionItem[] {
		const { currentUserId } = this.props;
		const { actionMessage } = this.state;
		if (!actionMessage) return [];

		const self = this;
		const isOwn = actionMessage.user === currentUserId;
		const actions: ActionItem[] = [];

		actions.push({
			label: "Reply in Thread",
			onPress: function () {
				self.setState({ actionMessage: null });
				self.props.onThread(actionMessage);
			}
		});

		actions.push({
			label: "Add Reaction",
			onPress: function () {
				self.setState({ actionMessage: null, emojiPickerMode: "reaction" });
			}
		});

		if (isOwn) {
			actions.push({
				label: "Edit Message",
				onPress: function () {
					self.setState({
						editingMessage: actionMessage,
						inputText: actionMessage.text,
						actionMessage: null
					});
				}
			});
			actions.push({
				label: "Delete Message",
				destructive: true,
				onPress: function () {
					Alert.alert("Delete", "Delete this message?", [
						{
							text: "Cancel",
							style: "cancel",
							onPress: function () {
								self.setState({ actionMessage: null });
							}
						},
						{
							text: "Delete",
							style: "destructive",
							onPress: function () {
								self.deleteMessage(actionMessage);
							}
						}
					]);
				}
			});
		}

		return actions;
	}

	render(): React.ReactElement {
		const {
			slack: _slack,
			channel,
			usersMap,
			currentUserId,
			onBack,
			onThread: _onThread,
			onMembers
		} = this.props;
		const {
			messages,
			loading,
			loadingMore,
			inputText,
			sending,
			editingMessage,
			actionMessage,
			viewerImage,
			viewerAudio,
			emojiPickerMode,
			uploading,
			recording,
			recordingTime
		} = this.state;
		const self = this;
		const channelName = getChannelDisplayName(channel, usersMap, currentUserId);
		const c = getColors();

		return (
			<View style={[styles.container, { backgroundColor: c.bg }]}>
				<Header
					title={(!channel.is_im ? "# " : "") + channelName}
					subtitle={channel.topic && channel.topic.value ? channel.topic.value : null}
					onBack={onBack}
					rightIcon="info"
					onRight={onMembers}
				/>

				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator
							size="large"
							color={c.accent}
						/>
					</View>
				) : (
					<View style={styles.listWrapper}>
						<FlatList
							ref={this._listRef}
							data={messages}
							inverted
							keyExtractor={this._keyExtractor}
							renderItem={this._renderItem}
							onScroll={this._onScroll}
							scrollEventThrottle={100}
							removeClippedSubviews={true}
							maxToRenderPerBatch={8}
							windowSize={7}
							initialNumToRender={12}
							ListFooterComponent={
								loadingMore ? (
									<View style={styles.loadMore}>
										<ActivityIndicator
											size="small"
											color={c.accent}
										/>
									</View>
								) : self.state.hasMore ? (
									<TouchableOpacity
										style={styles.loadMore}
										onPress={function () {
											self.loadMore();
										}}
										data-type="btn">
										<Text style={[styles.loadMoreText, { color: c.accentLight }]}>Load older messages</Text>
									</TouchableOpacity>
								) : null
							}
							ListEmptyComponent={
								<View style={styles.center}>
									<Text style={[styles.emptyText, { color: c.textTertiary }]}>No messages yet</Text>
								</View>
							}
						/>
						{self.state.showScrollBtn ? (
							<TouchableOpacity
								style={[styles.scrollBtn, { backgroundColor: c.scrollBtnBg || c.accent }]}
								data-type="icon-btn"
								onPress={function () {
									self._userScrolledUp = false;
									self._unseenCount = 0;
									self.setState({ showScrollBtn: false });
									self.markRead(self.state.messages);
									if (self._list) {
										self._list.scrollToOffset({ offset: 0, animated: true });
									}
								}}>
								{self._unseenCount > 0 ? (
									<View style={[styles.unseenBadge, { backgroundColor: c.badgeBg || "#E01E5A" }]}>
										<Text style={styles.unseenBadgeText}>
											{self._unseenCount > 99 ? "99+" : self._unseenCount}
										</Text>
									</View>
								) : null}
								<Icon
									name="chevron-down"
									size={20}
									color="#FFFFFF"
								/>
							</TouchableOpacity>
						) : null}
					</View>
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
				<View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.bg }]}>
					{editingMessage ? (
						<View style={[styles.editBanner, { backgroundColor: c.bgTertiary }]}>
							<Text style={[styles.editBannerText, { color: c.accentLight }]}>Editing message</Text>
							<TouchableOpacity
								onPress={function () {
									self.setState({ editingMessage: null, inputText: "" });
								}}
								data-type="text-btn">
								<Text style={styles.editCancel}>Cancel</Text>
							</TouchableOpacity>
						</View>
					) : null}
					{recording ? (
						<View style={styles.inputRow}>
							<View style={styles.recordingRow}>
								<View style={[styles.recordingDot, { backgroundColor: "#E01E5A" }]} />
								<Text style={[styles.recordingText, { color: c.textSecondary }]}>
									{Math.floor(recordingTime / 60) +
										":" +
										(recordingTime % 60 < 10 ? "0" : "") +
										(recordingTime % 60)}
								</Text>
							</View>
							<TouchableOpacity
								style={[styles.actionBtn]}
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
						<View style={styles.inputRow}>
							<TouchableOpacity
								style={styles.actionBtn}
								onPress={function () {
									self.handleAttachment();
								}}
								disabled={uploading || sending}
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
								placeholder="Message..."
								placeholderTextColor={c.textPlaceholder}
								value={inputText}
								onChangeText={function (t: string) {
									self.setState({ inputText: t });
								}}
								onSubmitEditing={function () {
									self.sendMessage();
								}}
								returnKeyType="send"
								multiline={false}
								autoFocus={true}
							/>
							{inputText.trim() ? (
								<TouchableOpacity
									style={[
										styles.sendBtn,
										{ backgroundColor: c.green },
										(sending || uploading) && styles.sendDisabled
									]}
									onPress={function () {
										self.sendMessage();
									}}
									disabled={sending || uploading}
									data-type="btn">
									{sending || uploading ? (
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
									style={[styles.micBtn, { backgroundColor: c.green }, uploading && styles.sendDisabled]}
									onPress={function () {
										self.handleStartRecording();
									}}
									disabled={uploading}
									data-type="btn">
									{uploading ? (
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

				<ActionSheet
					visible={!!actionMessage}
					actions={this.getActions()}
					onClose={function () {
						self.setState({ actionMessage: null });
					}}
				/>

				<ImageViewer
					visible={!!viewerImage}
					source={viewerImage ? viewerImage.uri : ""}
					fileName={viewerImage ? viewerImage.name : ""}
					token={viewerImage ? viewerImage.token : ""}
					onClose={function () {
						self.setState({ viewerImage: null });
					}}
				/>

				<AudioPlayer
					visible={!!viewerAudio}
					source={viewerAudio ? viewerAudio.uri : ""}
					fileName={viewerAudio ? viewerAudio.name : ""}
					token={viewerAudio ? viewerAudio.token : ""}
					onClose={function () {
						self.setState({ viewerAudio: null });
					}}
				/>

				<EmojiPicker
					visible={!!emojiPickerMode}
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
	listWrapper: ViewStyle;
	center: ViewStyle;
	emptyText: TextStyle;
	loadMore: ViewStyle;
	loadMoreText: TextStyle;
	inputBar: ViewStyle;
	editBanner: ViewStyle;
	editBannerText: TextStyle;
	editCancel: TextStyle;
	inputRow: ViewStyle;
	input: TextStyle;
	sendBtn: ViewStyle;
	sendDisabled: ViewStyle;
	actionBtn: ViewStyle;
	micBtn: ViewStyle;
	recordingRow: ViewStyle;
	recordingDot: ViewStyle;
	recordingText: TextStyle;
	scrollBtn: ViewStyle;
	unseenBadge: ViewStyle;
	unseenBadgeText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
	container: {
		flex: 1
	},
	listWrapper: {
		flex: 1
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
	loadMore: {
		padding: 12,
		alignItems: "center"
	},
	loadMoreText: {
		fontSize: 14
	},
	inputBar: {
		borderTopWidth: 1
	},
	editBanner: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 6
	},
	editBannerText: {
		fontSize: 13
	},
	editCancel: {
		color: "#E01E5A",
		fontSize: 13
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		padding: 8
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
	},
	scrollBtn: {
		position: "absolute",
		right: 16,
		bottom: 12,
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		zIndex: 10,
		elevation: 5
	},
	unseenBadge: {
		position: "absolute",
		top: -8,
		right: -4,
		borderRadius: 10,
		minWidth: 20,
		paddingHorizontal: 5,
		paddingVertical: 2,
		alignItems: "center",
		zIndex: 11
	},
	unseenBadgeText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontWeight: "bold"
	}
});
