import { NativeModules } from "react-native";

interface HttpModuleInterface {
	downloadFile(url: string, token: string, destPath: string): Promise<void>;
}

interface RNFSDownloadResult {
	statusCode: number;
}

interface RNFSModule {
	CachesDirectoryPath: string;
	downloadFile(options: { fromUrl: string; toFile: string; headers: Record<string, string> }): {
		promise: Promise<RNFSDownloadResult>;
	};
	unlink(path: string): Promise<void>;
}

const HttpModule = NativeModules.HttpModule as HttpModuleInterface | undefined;
const RNFS: RNFSModule = require("react-native-fs");

type AudioDownloadCallback = (error: string | null, path: string | null) => void;

function downloadAudio(url: string, token: string, callback: AudioDownloadCallback): void {
	const destPath = RNFS.CachesDirectoryPath + "/bb_audio_" + Date.now() + ".mp4";

	if (HttpModule && HttpModule.downloadFile) {
		HttpModule.downloadFile(url, token, destPath)
			.then(function () {
				callback(null, destPath);
			})
			.catch(function () {
				callback("Failed to download audio", null);
			});
	} else {
		RNFS.downloadFile({
			fromUrl: url,
			toFile: destPath,
			headers: { Authorization: "Bearer " + token }
		})
			.promise.then(function (res: RNFSDownloadResult) {
				if (res.statusCode === 200) {
					callback(null, destPath);
				} else {
					callback("Failed to download audio", null);
				}
			})
			.catch(function () {
				callback("Failed to download audio", null);
			});
	}
}

function cleanupFile(path: string | null): void {
	if (path) {
		RNFS.unlink(path).catch(function () {});
	}
}

export default { downloadAudio: downloadAudio, cleanupFile: cleanupFile };
