export interface RTMConnectResponse {
	ok: boolean;
	url: string;
	self: { id: string; name: string };
	team: { id: string; name: string; domain: string };
}

export interface RTMEvent {
	type: string;
	subtype?: string;
	channel?: string;
	user?: string;
	text?: string;
	ts?: string;
	event_ts?: string;
	item?: { type: string; channel: string; ts: string };
	reaction?: string;
	item_user?: string;
	reply_to?: number;
}

export type RTMEventCallback = (event: RTMEvent) => void;
