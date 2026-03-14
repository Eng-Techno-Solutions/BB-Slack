import { request, uploadBinary, uploadFile } from "./http";
import { Platform } from "react-native";

const BASE: string = Platform.OS === "web" ? "/slack-api/" : "https://slack.com/api/";

interface SlackResponse {
	ok: boolean;
	error?: string;
	[key: string]: unknown;
}

interface FileData {
	name?: string;
	type?: string;
	size?: number;
	base64?: string;
	file?: File;
	blob?: Blob;
}

interface UploadCompleteBody {
	files: Array<{ id: string; title: string }>;
	channel_id?: string;
	thread_ts?: string;
	initial_comment?: string;
}

interface UploadFields {
	channels: string;
	filename?: string;
	thread_ts?: string;
	initial_comment?: string;
	[key: string]: string | undefined;
}

export default class SlackAPI {
	token: string;

	constructor(token: string) {
		this.token = token;
	}

	_headers(): Record<string, string> {
		return {
			Authorization: "Bearer " + this.token,
			"Content-Type": "application/json; charset=utf-8"
		};
	}

	_authHeaders(): Record<string, string> {
		return {
			Authorization: "Bearer " + this.token
		};
	}

	async _get(
		method: string,
		params: Record<string, string | number | boolean | undefined | null>
	): Promise<SlackResponse> {
		const qs = Object.keys(params || {})
			.filter(function (k) {
				return params[k] !== undefined && params[k] !== null;
			})
			.map(function (k) {
				return encodeURIComponent(k) + "=" + encodeURIComponent(String(params[k]));
			})
			.join("&");
		const url = BASE + method + (qs ? "?" + qs : "");
		const res = await request("GET", url, this._authHeaders(), "");
		const data: SlackResponse = JSON.parse(res.body);
		if (!data.ok) throw new Error((data.error as string) || "Unknown error");
		return data;
	}

	async _post(method: string, body: Record<string, unknown>): Promise<SlackResponse> {
		const url = BASE + method;
		const res = await request("POST", url, this._headers(), JSON.stringify(body));
		const data: SlackResponse = JSON.parse(res.body);
		if (!data.ok) throw new Error((data.error as string) || "Unknown error");
		return data;
	}

	// Auth
	authTest(): Promise<SlackResponse> {
		return this._post("auth.test", {});
	}

	// Conversations
	conversationsList(types?: string, cursor?: string, limit?: number): Promise<SlackResponse> {
		return this._get("conversations.list", {
			types: types || "public_channel,private_channel,mpim,im",
			cursor: cursor,
			limit: limit || 200,
			exclude_archived: true
		});
	}

	conversationsHistory(channel: string, cursor?: string, limit?: number): Promise<SlackResponse> {
		return this._get("conversations.history", {
			channel: channel,
			cursor: cursor,
			limit: limit || 30
		});
	}

	conversationsReplies(
		channel: string,
		ts: string,
		cursor?: string,
		limit?: number
	): Promise<SlackResponse> {
		return this._get("conversations.replies", {
			channel: channel,
			ts: ts,
			cursor: cursor,
			limit: limit || 50
		});
	}

	conversationsInfo(channel: string): Promise<SlackResponse> {
		return this._get("conversations.info", { channel: channel });
	}

	conversationsMembers(channel: string, cursor?: string, limit?: number): Promise<SlackResponse> {
		return this._get("conversations.members", {
			channel: channel,
			cursor: cursor,
			limit: limit || 100
		});
	}

	conversationsOpen(users: string): Promise<SlackResponse> {
		return this._post("conversations.open", { users: users });
	}

	conversationsMark(channel: string, ts: string): Promise<SlackResponse> {
		return this._post("conversations.mark", { channel: channel, ts: ts });
	}

	conversationsJoin(channel: string): Promise<SlackResponse> {
		return this._post("conversations.join", { channel: channel });
	}

	// Chat
	chatPostMessage(channel: string, text: string, threadTs?: string): Promise<SlackResponse> {
		const body: Record<string, string> = { channel: channel, text: text };
		if (threadTs) body.thread_ts = threadTs;
		return this._post("chat.postMessage", body);
	}

	chatUpdate(channel: string, ts: string, text: string): Promise<SlackResponse> {
		return this._post("chat.update", { channel: channel, ts: ts, text: text });
	}

	chatDelete(channel: string, ts: string): Promise<SlackResponse> {
		return this._post("chat.delete", { channel: channel, ts: ts });
	}

	// Reactions
	reactionsAdd(channel: string, name: string, timestamp: string): Promise<SlackResponse> {
		return this._post("reactions.add", {
			channel: channel,
			name: name,
			timestamp: timestamp
		});
	}

	reactionsRemove(channel: string, name: string, timestamp: string): Promise<SlackResponse> {
		return this._post("reactions.remove", {
			channel: channel,
			name: name,
			timestamp: timestamp
		});
	}

	// Users
	usersList(cursor?: string, limit?: number): Promise<SlackResponse> {
		return this._get("users.list", {
			cursor: cursor,
			limit: limit || 200
		});
	}

	usersInfo(user: string): Promise<SlackResponse> {
		return this._get("users.info", { user: user });
	}

	usersSetPresence(presence: string): Promise<SlackResponse> {
		return this._post("users.setPresence", { presence: presence });
	}

	// Search
	searchMessages(query: string, cursor?: string, count?: number): Promise<SlackResponse> {
		return this._get("search.messages", {
			query: query,
			cursor: cursor,
			count: count || 20
		});
	}

	// Pins
	pinsList(channel: string): Promise<SlackResponse> {
		return this._get("pins.list", { channel: channel });
	}

	pinsAdd(channel: string, timestamp: string): Promise<SlackResponse> {
		return this._post("pins.add", { channel: channel, timestamp: timestamp });
	}

	pinsRemove(channel: string, timestamp: string): Promise<SlackResponse> {
		return this._post("pins.remove", { channel: channel, timestamp: timestamp });
	}

	// Stars
	starsAdd(channel: string, timestamp: string): Promise<SlackResponse> {
		return this._post("stars.add", { channel: channel, timestamp: timestamp });
	}

	starsRemove(channel: string, timestamp: string): Promise<SlackResponse> {
		return this._post("stars.remove", { channel: channel, timestamp: timestamp });
	}

	// Files
	async filesUpload(
		channel: string,
		fileData: FileData,
		threadTs?: string,
		comment?: string
	): Promise<SlackResponse> {
		const self = this;
		const fileName = fileData.name || "file";
		const fileSize = fileData.size || 0;

		// Try new V2 upload API first
		try {
			const urlResult = await this._get("files.getUploadURLExternal", {
				filename: fileName,
				length: fileSize
			});

			const uploadUrl = urlResult.upload_url as string;
			const fileId = urlResult.file_id as string;

			// Upload file binary to the presigned URL
			const contentType = fileData.type || "application/octet-stream";
			if (fileData.base64) {
				await uploadBinary(uploadUrl, fileData.base64, contentType);
			} else {
				// Web: use FormData upload
				const formData = new FormData();
				formData.append("file", (fileData.file || fileData.blob) as Blob, fileName);
				await fetch(uploadUrl, { method: "POST", body: formData }).then(function (res: Response) {
					if (!res.ok) throw new Error("Upload failed: " + res.status);
				});
			}

			// Complete the upload
			const completeBody: UploadCompleteBody = {
				files: [{ id: fileId, title: fileName }]
			};
			if (channel) completeBody.channel_id = channel;
			if (threadTs) completeBody.thread_ts = threadTs;
			if (comment) completeBody.initial_comment = comment;
			return await self._post(
				"files.completeUploadExternal",
				completeBody as unknown as Record<string, unknown>
			);
		} catch (_v2Err) {
			// Fallback to legacy upload if V2 fails
			const url = BASE + "files.upload";
			const fields: UploadFields = { channels: channel };
			if (fileData.name) fields.filename = fileData.name;
			if (threadTs) fields.thread_ts = threadTs;
			if (comment) fields.initial_comment = comment;
			const res = await uploadFile(
				url,
				self.token,
				fields as Record<string, string>,
				fileData as Required<Pick<FileData, "name" | "type">> & FileData
			);
			const data: SlackResponse = JSON.parse(res.body);
			if (!data.ok) throw new Error((data.error as string) || "Upload failed");
			return data;
		}
	}

	// Emoji
	emojiList(): Promise<SlackResponse> {
		return this._get("emoji.list", {});
	}

	// Team
	teamInfo(): Promise<SlackResponse> {
		return this._get("team.info", {});
	}
}
