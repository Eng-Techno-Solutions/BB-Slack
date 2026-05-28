import { getColors } from "../../theme";
import Icon from "./Icon";
import React, { Component } from "react";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

interface InputBarProps {
	inputText: string;
	onChangeText: (text: string) => void;
	onSubmit: () => void;
	onAttachment: () => void;
	onEmojiPress: () => void;
	sending: boolean;
	uploading: boolean;
	recording: boolean;
	recordingTime: number;
	onStartRecording: () => void;
	onStopRecording: () => void;
	onCancelRecording: () => void;
	editingMessage?: { text?: string } | null;
	onCancelEdit?: () => void;
	placeholder?: string;
	autoFocus?: boolean;
	inputRef?: (r: TextInput | null) => void;
}

export default class InputBar extends Component<InputBarProps> {
	render(): React.ReactElement {
		const {
			inputText,
			onChangeText,
			onSubmit,
			onAttachment,
			onEmojiPress,
			sending,
			uploading,
			recording,
			recordingTime,
			onStartRecording,
			onStopRecording,
			onCancelRecording,
			editingMessage,
			onCancelEdit,
			placeholder,
			autoFocus,
			inputRef
		} = this.props;
		const c = getColors();

		return (
			<View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.bg }]}>
				{editingMessage ? (
					<View style={[styles.editBanner, { backgroundColor: c.bgTertiary }]}>
						<Text style={[styles.editBannerText, { color: c.accentLight }]}>Editing message</Text>
						<TouchableOpacity
							onPress={function () {
								if (onCancelEdit) onCancelEdit();
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
							style={styles.actionBtn}
							onPress={function () {
								onCancelRecording();
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
								onStopRecording();
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
								onAttachment();
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
								onEmojiPress();
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
								if (inputRef) inputRef(r);
							}}
							style={[
								styles.input,
								{ backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: c.borderInput }
							]}
							placeholder={placeholder || "Message..."}
							placeholderTextColor={c.textPlaceholder}
							value={inputText}
							onChangeText={function (t: string) {
								onChangeText(t);
							}}
							onSubmitEditing={function () {
								onSubmit();
							}}
							returnKeyType="send"
							multiline={false}
							autoFocus={autoFocus !== false}
						/>
						{inputText.trim() ? (
							<TouchableOpacity
								style={[
									styles.sendBtn,
									{ backgroundColor: c.green },
									(sending || uploading) && styles.sendDisabled
								]}
								onPress={function () {
									onSubmit();
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
									onStartRecording();
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
		);
	}
}

interface InputBarStyles {
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
}

const styles = StyleSheet.create<InputBarStyles>({
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
	}
});
