import { getColors } from "../../theme";
import { EMOJI_MAP, getTwemojiUrl, replaceEmojisInText } from "../../utils/emoji";
import {
	parseFormatting,
	processTextSegment,
	restoreTokensAsText,
	tokenizeLinks
} from "../../utils/slackMarkup";
import type { SlackTextProps, SlackTextStyles, TextPart } from "./types";
import React from "react";
import { Image, Linking, Platform, StyleSheet, Text, View } from "react-native";

const IS_ANDROID: boolean = Platform.OS === "android";

function replaceEmojisWithImages(
	text: string,
	emojiOnly?: boolean
): string | Array<string | React.ReactElement> {
	if (!text) return text;
	if (!IS_ANDROID) return replaceEmojisInText(text);
	const parts: Array<string | React.ReactElement> = [];
	const regex = /:([a-zA-Z0-9_+-]+):/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let key = 0;
	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.substring(lastIndex, match.index));
		}
		const emoji = EMOJI_MAP[match[1]];
		if (emoji) {
			parts.push(
				React.createElement(Image, {
					key: "e" + key++,
					source: { uri: getTwemojiUrl(emoji) },
					style: emojiOnly ? styles.bigEmoji : styles.inlineEmoji
				})
			);
		} else {
			parts.push(match[0]);
		}
		lastIndex = match.index + match[0].length;
	}
	if (lastIndex < text.length) {
		parts.push(text.substring(lastIndex));
	}
	return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

function openUrl(url: string): void {
	if (Platform.OS === "web") {
		(window as any).open(url, "_blank");
	} else {
		Linking.openURL(url).catch(function () {});
	}
}

function renderPart(
	part: TextPart,
	key: number | string,
	c: any,
	emojiOnly?: boolean
): React.ReactNode {
	if (part.type === "link") {
		return (
			<Text
				key={key}
				style={[styles.link, { color: c.accentLight }]}
				onPress={function () {
					openUrl(part.url!);
				}}>
				{replaceEmojisWithImages(part.label || "")}
			</Text>
		);
	}
	if (part.type === "mention") {
		return (
			<Text
				key={key}
				style={[styles.mention, { color: c.accentLight, backgroundColor: c.mentionBg }]}>
				{part.value}
			</Text>
		);
	}
	if (part.type === "channel") {
		return (
			<Text
				key={key}
				style={[styles.channel, { color: c.accentLight }]}>
				{part.value}
			</Text>
		);
	}
	if (part.type === "code") {
		return (
			<Text
				key={key}
				style={[
					styles.inlineCode,
					{ color: c.codeInlineColor, backgroundColor: c.codeInlineBg, borderColor: c.codeBorder }
				]}>
				{part.value}
			</Text>
		);
	}
	if (part.type === "bold" || part.type === "italic" || part.type === "strike") {
		const s =
			part.type === "bold" ? styles.bold : part.type === "italic" ? styles.italic : styles.strike;
		if (part.children) {
			return (
				<Text
					key={key}
					style={s}>
					{part.children.map(function (child: TextPart, j: number) {
						return renderPart(child, key + "_" + j, c, emojiOnly);
					})}
				</Text>
			);
		}
		return (
			<Text
				key={key}
				style={s}>
				{replaceEmojisWithImages(part.value || "", emojiOnly)}
			</Text>
		);
	}
	return replaceEmojisWithImages(part.value || "", emojiOnly);
}

class SlackText extends React.Component<SlackTextProps> {
	shouldComponentUpdate(nextProps: SlackTextProps): boolean {
		return (
			this.props.text !== nextProps.text ||
			this.props.emojiOnly !== nextProps.emojiOnly ||
			this.props.style !== nextProps.style ||
			this.props.numberOfLines !== nextProps.numberOfLines
		);
	}

	render(): React.ReactNode {
		const { text, usersMap, style, numberOfLines, emojiOnly } = this.props;
		if (!text) return null;

		const c = getColors();

		const tokenized = tokenizeLinks(text);
		const codeParts = parseFormatting(tokenized.text);

		let allParts: TextPart[] = [];
		for (let i = 0; i < codeParts.length; i++) {
			const cp = codeParts[i];
			if (cp.type === "codeblock" || cp.type === "code") {
				cp.value = restoreTokensAsText(cp.value || "", tokenized.tokens);
				allParts.push(cp);
			} else {
				const processed = processTextSegment(cp.value || "", tokenized.tokens, usersMap);
				allParts = allParts.concat(processed);
			}
		}

		let hasBlock = false;
		for (let i = 0; i < allParts.length; i++) {
			if (allParts[i].type === "codeblock") {
				hasBlock = true;
				break;
			}
		}

		const textStyle = emojiOnly ? [style, styles.emojiOnlyText] : style;

		if (!hasBlock) {
			return (
				<Text
					style={textStyle}
					numberOfLines={numberOfLines}>
					{allParts.map(function (part: TextPart, i: number) {
						return renderPart(part, i, c, emojiOnly);
					})}
				</Text>
			);
		}

		return (
			<View>
				{allParts.map(function (part: TextPart, i: number) {
					if (part.type === "codeblock") {
						return (
							<View
								key={i}
								style={[styles.codeBlock, { backgroundColor: c.codeBlockBg, borderColor: c.codeBorder }]}>
								<Text style={[styles.codeBlockText, { color: c.textSecondary }]}>{part.value}</Text>
							</View>
						);
					}
					return (
						<Text
							key={i}
							style={textStyle}>
							{renderPart(part, i, c, emojiOnly)}
						</Text>
					);
				})}
			</View>
		);
	}
}

const styles = StyleSheet.create<SlackTextStyles>({
	link: {
		textDecorationLine: "underline"
	},
	mention: {
		fontWeight: "600"
	},
	channel: {
		fontWeight: "600"
	},
	inlineCode: {
		fontFamily: "monospace",
		fontSize: 13,
		paddingHorizontal: 4,
		paddingVertical: 1,
		borderRadius: 3,
		borderWidth: 1
	},
	codeBlock: {
		borderRadius: 6,
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginVertical: 4
	},
	codeBlockText: {
		fontFamily: "monospace",
		fontSize: 13,
		lineHeight: 20
	},
	bold: {
		fontWeight: "bold"
	},
	italic: {
		fontStyle: "italic"
	},
	strike: {
		textDecorationLine: "line-through"
	},
	inlineEmoji: {
		width: 18,
		height: 18
	},
	bigEmoji: {
		width: 36,
		height: 36
	},
	emojiOnlyText: {
		fontSize: 36,
		lineHeight: 44
	}
});

export default SlackText;
