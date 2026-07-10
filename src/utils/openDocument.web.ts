import type { SlackFile } from "../types";

// Web: open the file's Slack permalink in a new tab. The browser's built-in
// PDF viewer handles the preview.
export function openDocument(file: SlackFile, _token?: string): void {
	const url = file.permalink || file.permalink_public || "";
	if (url) window.open(url, "_blank");
}
