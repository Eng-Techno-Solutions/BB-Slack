import type { SlackResponse } from "../types";

export interface HttpModuleInterface {
	request(method: string, url: string, headers: string, body: string): Promise<string>;
	uploadMultipart(
		url: string,
		token: string,
		fields: string,
		name: string,
		type: string,
		base64: string
	): Promise<string>;
	uploadBinary(url: string, fileBase64: string, contentType: string): Promise<string>;
	downloadFile(url: string, token: string, destPath: string): Promise<void>;
}

export interface HttpResponse {
	status: number;
	body: string;
}

export interface FileData {
	name?: string;
	type?: string;
	size?: number;
	base64?: string;
	file?: File;
	blob?: Blob;
}

export interface UploadCompleteBody {
	files: Array<{ id: string; title: string }>;
	channel_id?: string;
	thread_ts?: string;
	initial_comment?: string;
}

export interface UploadFields {
	channels: string;
	filename?: string;
	thread_ts?: string;
	initial_comment?: string;
	[key: string]: string | undefined;
}

export interface CacheEntry<T = unknown> {
	data: T | undefined;
	error: Error | null;
	updatedAt: number;
	timeout: ReturnType<typeof setTimeout> | null;
}

export interface QueryOptions {
	staleTime?: number;
	cacheTime?: number;
	forceRefresh?: boolean;
}

export type CacheListener<T = unknown> = (data: T | undefined, error: Error | null) => void;

export interface ISlackAPI {
	token: string;
	authTest(): Promise<SlackResponse>;
	conversationsList(types?: string, cursor?: string, limit?: number): Promise<SlackResponse>;
	conversationsHistory(
		channel: string,
		cursor?: string | null,
		limit?: number
	): Promise<SlackResponse>;
	conversationsReplies(
		channel: string,
		ts: string,
		cursor?: string,
		limit?: number
	): Promise<SlackResponse>;
	conversationsInfo(channel: string): Promise<SlackResponse>;
	conversationsMembers(channel: string, cursor?: string, limit?: number): Promise<SlackResponse>;
	conversationsOpen(users: string): Promise<SlackResponse>;
	conversationsMark(channel: string, ts: string): Promise<SlackResponse>;
	conversationsJoin(channel: string): Promise<SlackResponse>;
	chatPostMessage(channel: string, text: string, threadTs?: string): Promise<SlackResponse>;
	chatUpdate(channel: string, ts: string, text: string): Promise<SlackResponse>;
	chatDelete(channel: string, ts: string): Promise<SlackResponse>;
	reactionsAdd(channel: string, name: string, timestamp: string): Promise<SlackResponse>;
	reactionsRemove(channel: string, name: string, timestamp: string): Promise<SlackResponse>;
	usersList(cursor?: string, limit?: number): Promise<SlackResponse>;
	usersInfo(user: string): Promise<SlackResponse>;
	usersSetPresence(presence: string): Promise<SlackResponse>;
	searchMessages(query: string, cursor?: string, count?: number): Promise<SlackResponse>;
	pinsList(channel: string): Promise<SlackResponse>;
	pinsAdd(channel: string, timestamp: string): Promise<SlackResponse>;
	pinsRemove(channel: string, timestamp: string): Promise<SlackResponse>;
	starsAdd(channel: string, timestamp: string): Promise<SlackResponse>;
	starsRemove(channel: string, timestamp: string): Promise<SlackResponse>;
	filesUpload(
		channel: string,
		fileData: FileData,
		threadTs?: string,
		comment?: string
	): Promise<SlackResponse>;
	rtmConnect(): Promise<SlackResponse>;
	emojiList(): Promise<SlackResponse>;
	teamInfo(): Promise<SlackResponse>;
}

export type { SlackResponse };
