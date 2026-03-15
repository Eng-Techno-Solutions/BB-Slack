export interface SlackUserProfile {
	display_name?: string;
	image_72?: string;
	image_48?: string;
	title?: string;
	status_text?: string;
	email?: string;
	phone?: string;
	[key: string]: unknown;
}

export interface SlackUser {
	id: string;
	name?: string;
	real_name?: string;
	deleted?: boolean;
	is_bot?: boolean;
	tz_label?: string;
	tz?: string;
	profile?: SlackUserProfile;
	[key: string]: unknown;
}

export type UsersMap = Record<string, SlackUser>;

export interface SlackChannel {
	id: string;
	is_im?: boolean;
	is_mpim?: boolean;
	is_private?: boolean;
	user?: string;
	name?: string;
	name_normalized?: string;
	unread_count_display?: number;
	topic?: { value: string };
	purpose?: {
		value?: string;
		[key: string]: unknown;
	};
	_sectionHeader?: string;
	[key: string]: unknown;
}

export interface SlackReaction {
	name: string;
	count: number;
	users?: string[];
}

export interface SlackFile {
	id: string;
	name?: string;
	title?: string;
	mimetype?: string;
	filetype?: string;
	subtype?: string;
	url_private?: string;
	url_private_download?: string;
	thumb_160?: string;
	thumb_360?: string;
	thumb_360_w?: number;
	thumb_360_h?: number;
	thumb_480?: string;
	thumb_480_w?: number;
	thumb_480_h?: number;
	thumb_720?: string;
	thumb_800?: string;
	thumb_1024?: string;
	thumb_tiny?: string;
	original_w?: number;
	original_h?: number;
	permalink?: string;
	permalink_public?: string;
	size?: number;
	aac?: string;
	duration_ms?: number;
	audio_wave_samples?: number[];
	[key: string]: unknown;
}

export interface SlackMessage {
	ts: string;
	text?: string;
	user: string;
	username?: string;
	subtype?: string;
	thread_ts?: string;
	reply_count?: number;
	reactions?: SlackReaction[];
	files?: SlackFile[];
	attachments?: SlackAttachment[];
	edited?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface SlackAttachment {
	fallback?: string;
	color?: string;
	pretext?: string;
	author_name?: string;
	title?: string;
	title_link?: string;
	text?: string;
	image_url?: string;
	thumb_url?: string;
	footer?: string;
	ts?: string;
	[key: string]: unknown;
}

export interface SlackResponse {
	ok: boolean;
	error?: string;
	[key: string]: unknown;
}
