import { getColors, getMessageFontSize } from "../../theme";
import { isEmojiOnly } from "../../utils/fileHelpers";
import { formatTime, getUserName } from "../../utils/format";
import AttachmentRenderer from "./AttachmentRenderer";
import Avatar from "./Avatar";
import FileRenderer from "./FileRenderer";
import { styles } from "./MessageItem.styles";
import ReactionRow from "./ReactionRow";
import SlackText from "./SlackText";
import type { MessageItemProps } from "./types";
import React, { Component } from "react";
import { Text, TouchableHighlight, TouchableOpacity, View } from "react-native";

export default class MessageItem extends Component<MessageItemProps> {
	shouldComponentUpdate(nextProps: MessageItemProps): boolean {
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
		const prevA = prev.attachments || [];
		const nextA = next.attachments || [];
		if (prevA.length !== nextA.length) return true;
		return false;
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
		const attachments = message.attachments || [];
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
						<Avatar
							userId={message.user}
							userName={userName}
							usersMap={usersMap}
						/>
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
							<FileRenderer
								files={files}
								token={token}
								onImagePress={this.props.onImagePress}
								onAudioPress={this.props.onAudioPress}
							/>
						) : null}

						{attachments.length > 0 ? (
							<AttachmentRenderer
								attachments={attachments}
								usersMap={usersMap}
							/>
						) : null}

						{reactions.length > 0 ? (
							<ReactionRow
								reactions={reactions}
								currentUserId={currentUserId}
								usersMap={usersMap}
								onReactionPress={function (reactionName: string, reacted: boolean) {
									if (self.props.onReactionPress) {
										self.props.onReactionPress(message, reactionName, reacted);
									}
								}}
							/>
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
