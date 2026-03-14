type AudioDownloadCallback = (error: string | null, url: string | null) => void;

function downloadAudio(url: string, token: string, callback: AudioDownloadCallback): void {
	callback(null, url);
}

function cleanupFile(): void {}

export default { downloadAudio: downloadAudio, cleanupFile: cleanupFile };
