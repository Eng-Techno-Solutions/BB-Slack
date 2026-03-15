import type { SlackFile } from "../types";
import { EMOJI_MAP } from "./emoji";
import { Platform } from "react-native";
import type { ImageSourcePropType } from "react-native";

export function proxyUrl(url: string, token?: string): string {
	if (Platform.OS === "web" && url && token) {
		return "/slack-file?url=" + encodeURIComponent(url) + "&token=" + encodeURIComponent(token);
	}
	return url;
}

export function imageSource(url: string, token?: string): ImageSourcePropType {
	if (Platform.OS !== "web" && url && token) {
		return { uri: url, headers: { Authorization: "Bearer " + token } };
	}
	return { uri: url };
}

export function isImageFile(file: SlackFile): boolean {
	if (file.mimetype && file.mimetype.indexOf("image/") === 0) return true;
	const name = (file.name || file.title || "").toLowerCase();
	return name.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/) !== null;
}

export function isAudioFile(file: SlackFile): boolean {
	if (file.subtype === "slack_audio") return true;
	if (file.mimetype && file.mimetype.indexOf("audio/") === 0) return true;
	return false;
}

export function formatDuration(ms: number): string {
	const secs = Math.round(ms / 1000);
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return m + ":" + (s < 10 ? "0" : "") + s;
}

export function isEmojiOnly(text: string): boolean {
	if (!text) return false;
	const withoutEmojis = text.replace(/:([a-zA-Z0-9_+-]+):/g, function (match: string, name: string) {
		return EMOJI_MAP[name] ? "" : match;
	});
	return withoutEmojis.trim().length === 0;
}
