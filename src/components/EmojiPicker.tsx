import { getColors } from "../theme";
import { EMOJI_MAP, getTwemojiUrl } from "../utils/emoji";
import React, { Component } from "react";
import {
	FlatList,
	Image,
	Modal,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from "react-native";
import type { ImageStyle, ListRenderItemInfo, TextStyle, ViewStyle } from "react-native";

const IS_ANDROID: boolean = Platform.OS === "android";

interface EmojiEntry {
	name: string;
	emoji: string;
	url: string | null;
}

const ALL_EMOJIS: EmojiEntry[] = Object.keys(EMOJI_MAP).reduce(
	function (acc: { list: EmojiEntry[]; seen: Record<string, boolean> }, name: string) {
		const emoji = EMOJI_MAP[name];
		if (acc.seen[emoji]) return acc;
		acc.seen[emoji] = true;
		const url = IS_ANDROID ? getTwemojiUrl(emoji) : null;
		if (IS_ANDROID && !url) return acc;
		acc.list.push({ name: name, emoji: emoji, url: url });
		return acc;
	},
	{ list: [], seen: {} }
).list;

interface EmojiPickerProps {
	visible: boolean;
	onSelect: (name: string, emoji: string) => void;
	onClose: () => void;
}

interface EmojiPickerState {
	search: string;
}

interface EmojiPickerStyles {
	overlay: ViewStyle;
	backdrop: ViewStyle;
	container: ViewStyle;
	header: ViewStyle;
	title: TextStyle;
	closeBtn: TextStyle;
	search: TextStyle;
	emojiBtn: ViewStyle;
	emojiText: TextStyle;
	emojiImg: ImageStyle;
}

export default class EmojiPicker extends Component<EmojiPickerProps, EmojiPickerState> {
	constructor(props: EmojiPickerProps) {
		super(props);
		this.state = { search: "" };
		this._renderItem = this._renderItem.bind(this);
	}

	getFiltered(): EmojiEntry[] {
		const q = this.state.search.toLowerCase().trim();
		if (!q) return ALL_EMOJIS;
		return ALL_EMOJIS.filter(function (e: EmojiEntry) {
			return e.name.indexOf(q) !== -1;
		});
	}

	_renderItem(info: ListRenderItemInfo<EmojiEntry>): React.ReactElement {
		const e = info.item;
		const self = this;
		const onSelect = this.props.onSelect;
		return (
			<TouchableOpacity
				style={styles.emojiBtn}
				data-type="emoji-item"
				onPress={function () {
					self.setState({ search: "" });
					onSelect(e.name, e.emoji);
				}}>
				{IS_ANDROID ? (
					<Image
						source={{ uri: e.url! }}
						style={styles.emojiImg}
					/>
				) : (
					<Text style={styles.emojiText}>{e.emoji}</Text>
				)}
			</TouchableOpacity>
		);
	}

	render(): React.ReactNode {
		const { visible, onSelect: _onSelect, onClose } = this.props;
		const { search } = this.state;
		const self = this;
		const filtered = this.getFiltered();
		const c = getColors();

		return (
			<Modal
				visible={visible}
				transparent={true}
				animationType="slide"
				onRequestClose={onClose}>
				<View style={[styles.overlay, { backgroundColor: c.overlayLight }]}>
					<TouchableOpacity
						style={styles.backdrop}
						activeOpacity={1}
						onPress={onClose}
						data-type="overlay"
					/>
					<View style={[styles.container, { backgroundColor: c.bgTertiary }]}>
						<View style={styles.header}>
							<Text style={[styles.title, { color: c.textSecondary }]}>Emoji</Text>
							<TouchableOpacity
								onPress={onClose}
								data-type="text-btn">
								<Text style={[styles.closeBtn, { color: c.textTertiary }]}>Close</Text>
							</TouchableOpacity>
						</View>
						<TextInput
							style={[
								styles.search,
								{ backgroundColor: c.bg, color: c.textSecondary, borderColor: c.border }
							]}
							placeholder="Search emoji..."
							placeholderTextColor={c.textPlaceholder}
							value={search}
							onChangeText={function (t: string) {
								self.setState({ search: t });
							}}
							autoCorrect={false}
						/>
						<FlatList
							data={filtered}
							keyExtractor={keyExtractor}
							numColumns={8}
							keyboardShouldPersistTaps="handled"
							initialNumToRender={16}
							maxToRenderPerBatch={16}
							windowSize={3}
							removeClippedSubviews={true}
							renderItem={this._renderItem}
							getItemLayout={getItemLayout}
						/>
					</View>
				</View>
			</Modal>
		);
	}
}

function keyExtractor(item: EmojiEntry): string {
	return item.name;
}

function getItemLayout(
	_data: ArrayLike<EmojiEntry> | null | undefined,
	index: number
): { length: number; offset: number; index: number } {
	return { length: 44, offset: 44 * Math.floor(index / 8), index: index };
}

const styles = StyleSheet.create<EmojiPickerStyles>({
	overlay: {
		flex: 1,
		justifyContent: "flex-end"
	},
	backdrop: {
		flex: 1
	},
	container: {
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
		maxHeight: "50%",
		paddingBottom: 20
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 8
	},
	title: {
		fontSize: 16,
		fontWeight: "bold"
	},
	closeBtn: {
		fontSize: 14
	},
	search: {
		fontSize: 14,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginHorizontal: 16,
		marginBottom: 8,
		borderRadius: 6,
		borderWidth: 1
	},
	emojiBtn: {
		flex: 1,
		height: 44,
		justifyContent: "center",
		alignItems: "center"
	},
	emojiText: {
		fontSize: 24
	},
	emojiImg: {
		width: 28,
		height: 28
	}
});
