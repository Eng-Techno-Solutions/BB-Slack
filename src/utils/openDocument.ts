import type { SlackFile } from "../types";
import { logger } from "./logger";
import type { DocumentHttpModule, RNFSModule } from "./types";
import { Alert, NativeModules, ToastAndroid } from "react-native";

const HttpModule = NativeModules.HttpModule as DocumentHttpModule | undefined;
const RNFS: RNFSModule = require("react-native-fs");

const MIME_BY_TYPE: Record<string, string> = {
	pdf: "application/pdf",
	doc: "application/msword",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	xls: "application/vnd.ms-excel",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	ppt: "application/vnd.ms-powerpoint",
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	txt: "text/plain",
	csv: "text/csv",
	zip: "application/zip"
};

function resolveMimeType(file: SlackFile): string {
	if (file.mimetype) return file.mimetype;
	const type = (file.filetype || "").toLowerCase();
	return MIME_BY_TYPE[type] || "*/*";
}

function safeFileName(file: SlackFile): string {
	const raw = file.name || file.title || "file";
	return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function openDownloaded(destPath: string, mimeType: string, dir: string, fileName: string): void {
	if (!HttpModule || !HttpModule.openFile) return;
	HttpModule.openFile(destPath, mimeType).catch(function (err: { code?: string } | unknown) {
		const code = (err as { code?: string }).code;
		if (code === "NO_HANDLER") {
			Alert.alert("No viewer installed", "This device has no app to open " + fileName + ".");
		} else {
			logger.warn("openDocument", "open failed", err);
			Alert.alert("Could not open", fileName + " is saved in " + dir + ".");
		}
	});
}

// Android: download the authed file into the device's Downloads folder, then
// offer to open it in the device's viewer. We use a file:// intent rather than
// FileProvider — the runtime is < API 24, and a ContentProvider crashed on boot.
export function openDocument(file: SlackFile, token?: string): void {
	const url = file.url_private_download || file.url_private || "";

	if (!url || !token || !HttpModule || !HttpModule.downloadFile) {
		Alert.alert("Cannot download", "This file can't be downloaded.");
		return;
	}

	const external = RNFS.ExternalStorageDirectoryPath;
	const dir = external ? external + "/Download" : RNFS.CachesDirectoryPath;
	const fileName = safeFileName(file);
	const destPath = dir + "/" + fileName;
	const mimeType = resolveMimeType(file);

	ToastAndroid.show("Downloading " + fileName + "…", ToastAndroid.SHORT);

	// mkdir is a no-op if the folder already exists; swallow so we still attempt
	// the download even when the path is present.
	RNFS.mkdir(dir)
		.catch(function () {})
		.then(function () {
			return HttpModule.downloadFile(url, token, destPath);
		})
		.then(function () {
			Alert.alert("Downloaded", fileName + " was saved to " + dir + ".", [
				{
					text: "Open",
					onPress: function () {
						openDownloaded(destPath, mimeType, dir, fileName);
					}
				},
				{ text: "Close", style: "cancel" }
			]);
		})
		.catch(function (err: unknown) {
			logger.warn("openDocument", "download failed", err);
			Alert.alert("Download failed", "Could not download " + fileName + ". Please try again.");
		});
}
