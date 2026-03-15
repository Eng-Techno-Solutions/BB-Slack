import { EMOJI_DATA } from "./emojiData";
import { Platform } from "react-native";

// Re-export the complete map for consumers that need it (EmojiPicker, fileHelpers)
export const EMOJI_MAP = EMOJI_DATA;

export function emojiFromName(name: string): string | null {
	return EMOJI_MAP[name] || null;
}

export function replaceEmojisInText(text: string | null | undefined): string | null | undefined {
	if (!text) return text;
	// BB Q20 Android has no emoji font - keep shortcodes readable
	if (Platform.OS === "android") return text;
	return text.replace(/:([a-zA-Z0-9_+-]+):/g, function (match: string, name: string): string {
		const emoji = EMOJI_MAP[name];
		return emoji || match;
	});
}

export function getTwemojiUrl(emoji: string): string | null {
	try {
		if (!emoji || typeof emoji !== "string") return null;
		const codepoints: string[] = [];
		for (let i = 0; i < emoji.length; ) {
			const cp = emoji.codePointAt(i);
			if (cp === undefined) break;
			i += cp > 0xffff ? 2 : 1;
			if (cp !== 0xfe0f && cp !== 0xfe0e) {
				codepoints.push(cp.toString(16));
			}
		}
		if (codepoints.length === 0) return null;
		return (
			"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/" +
			codepoints.join("-") +
			".png"
		);
	} catch (e) {
		return null;
	}
}

export function getTwemojiUrlByName(name: string): string | null {
	const emoji = EMOJI_MAP[name];
	if (!emoji) return null;
	return getTwemojiUrl(emoji);
}
