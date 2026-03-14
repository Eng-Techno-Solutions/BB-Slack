import { getColors } from "../theme";
import { EMOJI_MAP, getTwemojiUrl, replaceEmojisInText } from "../utils/emoji";
import { getUserName } from "../utils/format";
import React from "react";
import { Image, Linking, Platform, StyleSheet, Text, View } from "react-native";
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from "react-native";

const IS_ANDROID: boolean = Platform.OS === "android";
const TOKEN_CHAR: string = "\x01";

interface UsersMap {
	[userId: string]: any;
}

interface TextPart {
	type: string;
	value?: string;
	url?: string;
	label?: string;
	children?: TextPart[];
}

interface TokenizedResult {
	text: string;
	tokens: string[];
}

interface SlackTextProps {
	text: string;
	usersMap?: UsersMap;
	style?: StyleProp<TextStyle>;
	numberOfLines?: number;
	emojiOnly?: boolean;
}

interface SlackTextStyles {
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

function resolveToken(inner: string, usersMap?: UsersMap): TextPart {
	const pipeIndex = inner.indexOf("|");
	const target = pipeIndex !== -1 ? inner.substring(0, pipeIndex) : inner;
	const label = pipeIndex !== -1 ? inner.substring(pipeIndex + 1) : null;

	if (
		target.indexOf("http://") === 0 ||
		target.indexOf("https://") === 0 ||
		target.indexOf("mailto:") === 0
	) {
		return {
			type: "link",
			url: target,
			label: label || target.replace(/^https?:\/\//, "").replace(/\/$/, "")
		};
	}
	if (target.charAt(0) === "@") {
		const userId = target.substring(1);
		const name = usersMap ? getUserName(userId, usersMap) : userId;
		return { type: "mention", value: "@" + (label || name) };
	}
	if (target.charAt(0) === "#") {
		return { type: "channel", value: "#" + (label || target.substring(1)) };
	}
	if (target.charAt(0) === "!") {
		const cmd = target.substring(1);
		if (cmd === "here" || cmd === "channel" || cmd === "everyone") {
			return { type: "mention", value: "@" + cmd };
		}
		if (label) {
			return { type: "mention", value: "@" + label };
		}
		return { type: "text", value: "@" + cmd };
	}
	if (pipeIndex !== -1) {
		return { type: "link", url: target, label: label! };
	}
	return { type: "text", value: "<" + inner + ">" };
}

function tokenizeLinks(text: string): TokenizedResult {
	const tokens: string[] = [];
	const result = text.replace(/<([^>]+)>/g, function (match: string) {
		const idx = tokens.length;
		tokens.push(match);
		return TOKEN_CHAR + idx + TOKEN_CHAR;
	});
	return { text: result, tokens: tokens };
}

const _TOKEN_REGEX: RegExp = new RegExp(TOKEN_CHAR + "(\\d+)" + TOKEN_CHAR, "g");

function expandTokens(text: string, tokens: string[], usersMap?: UsersMap): TextPart[] {
	const parts: TextPart[] = [];
	const regex = new RegExp(TOKEN_CHAR + "(\\d+)" + TOKEN_CHAR, "g");
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push({ type: "text", value: text.substring(lastIndex, match.index) });
		}
		const tokenIdx = parseInt(match[1]);
		const raw = tokens[tokenIdx];
		const inner = raw.substring(1, raw.length - 1);
		parts.push(resolveToken(inner, usersMap));
		lastIndex = match.index + match[0].length;
	}
	if (lastIndex < text.length) {
		parts.push({ type: "text", value: text.substring(lastIndex) });
	}
	return parts;
}

function restoreTokensAsText(text: string, tokens: string[]): string {
	return text.replace(
		new RegExp(TOKEN_CHAR + "(\\d+)" + TOKEN_CHAR, "g"),
		function (m: string, idx: string) {
			return tokens[parseInt(idx)];
		}
	);
}

function parseFormatting(text: string): TextPart[] {
	const result: TextPart[] = [];
	let remaining = text;

	while (remaining.length > 0) {
		const codeBlockIdx = remaining.indexOf("```");
		const inlineCodeIdx = remaining.indexOf("`");

		if (inlineCodeIdx === codeBlockIdx && codeBlockIdx !== -1) {
			const endBlock = remaining.indexOf("```", codeBlockIdx + 3);
			if (endBlock !== -1) {
				if (codeBlockIdx > 0) {
					result.push({ type: "text", value: remaining.substring(0, codeBlockIdx) });
				}
				result.push({ type: "codeblock", value: remaining.substring(codeBlockIdx + 3, endBlock) });
				remaining = remaining.substring(endBlock + 3);
				continue;
			}
		}

		if (inlineCodeIdx !== -1 && inlineCodeIdx !== codeBlockIdx) {
			const endInline = remaining.indexOf("`", inlineCodeIdx + 1);
			if (endInline !== -1) {
				if (inlineCodeIdx > 0) {
					result.push({ type: "text", value: remaining.substring(0, inlineCodeIdx) });
				}
				result.push({ type: "code", value: remaining.substring(inlineCodeIdx + 1, endInline) });
				remaining = remaining.substring(endInline + 1);
				continue;
			}
		}

		result.push({ type: "text", value: remaining });
		break;
	}

	return result;
}

function applyInlineFormatting(text: string): TextPart[] {
	const parts: TextPart[] = [];
	const regex = /(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push({ type: "text", value: text.substring(lastIndex, match.index) });
		}
		if (match[2]) {
			parts.push({ type: "bold", value: match[2] });
		} else if (match[4]) {
			parts.push({ type: "italic", value: match[4] });
		} else if (match[6]) {
			parts.push({ type: "strike", value: match[6] });
		}
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		parts.push({ type: "text", value: text.substring(lastIndex) });
	}

	return parts;
}

function processTextSegment(text: string, tokens: string[], usersMap?: UsersMap): TextPart[] {
	const inlineParts = applyInlineFormatting(text);
	let result: TextPart[] = [];
	for (let i = 0; i < inlineParts.length; i++) {
		const ip = inlineParts[i];
		const expanded = expandTokens(ip.value || "", tokens, usersMap);
		if (ip.type === "text") {
			result = result.concat(expanded);
		} else {
			result.push({ type: ip.type, children: expanded });
		}
	}
	return result;
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
