import { getMode, setFontSizeKey, setMode } from "../theme";
import type { FontSizeKey } from "../theme";
import {
	getFontSize,
	getNotifEnabled,
	getNotifInterval,
	getSoundEnabled,
	getTheme,
	saveFontSize,
	saveNotifEnabled,
	saveNotifInterval,
	saveSoundEnabled,
	saveTheme,
	setNotificationMuted
} from "../utils";

export interface SettingsValues {
	notifInterval: number;
	notifEnabled: boolean;
	soundEnabled: boolean;
	fontSize: string;
}

export async function loadAllSettings(): Promise<SettingsValues> {
	const interval = await getNotifInterval();
	const enabled = await getNotifEnabled();
	const sound = await getSoundEnabled();
	const font = await getFontSize();
	setNotificationMuted(!sound);
	setFontSizeKey(font);
	return {
		notifInterval: interval,
		notifEnabled: enabled,
		soundEnabled: sound,
		fontSize: font
	};
}

export async function loadThemeMode(): Promise<string> {
	const mode = await getTheme();
	setMode(mode);
	return mode;
}

export function toggleThemeMode(): string {
	const newMode = getMode() === "dark" ? "light" : "dark";
	setMode(newMode);
	saveTheme(newMode);
	return newMode;
}

export async function persistNotifEnabled(enabled: boolean): Promise<void> {
	await saveNotifEnabled(enabled);
}

export async function persistNotifInterval(ms: number): Promise<void> {
	await saveNotifInterval(ms);
}

export async function persistSoundEnabled(enabled: boolean): Promise<void> {
	await saveSoundEnabled(enabled);
	setNotificationMuted(!enabled);
}

export async function persistFontSize(size: string): Promise<void> {
	await saveFontSize(size as FontSizeKey);
	setFontSizeKey(size as FontSizeKey);
}
