import type { TextPart, TokenizedResult } from "../components/message/types";
import type { UsersMap } from "../types";
import { getUserName } from "./format";

export const TOKEN_CHAR: string = "\x01";

export function resolveToken(inner: string, usersMap?: UsersMap): TextPart {
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

export function tokenizeLinks(text: string): TokenizedResult {
	const tokens: string[] = [];
	const result = text.replace(/<([^>]+)>/g, function (match: string) {
		const idx = tokens.length;
		tokens.push(match);
		return TOKEN_CHAR + idx + TOKEN_CHAR;
	});
	return { text: result, tokens: tokens };
}

export function expandTokens(text: string, tokens: string[], usersMap?: UsersMap): TextPart[] {
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

export function restoreTokensAsText(text: string, tokens: string[]): string {
	return text.replace(
		new RegExp(TOKEN_CHAR + "(\\d+)" + TOKEN_CHAR, "g"),
		function (m: string, idx: string) {
			return tokens[parseInt(idx)];
		}
	);
}

export function parseFormatting(text: string): TextPart[] {
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

export function applyInlineFormatting(text: string): TextPart[] {
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

export function processTextSegment(
	text: string,
	tokens: string[],
	usersMap?: UsersMap
): TextPart[] {
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
