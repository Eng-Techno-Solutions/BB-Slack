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

export type { SlackResponse };
