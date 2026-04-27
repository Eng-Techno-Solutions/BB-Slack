import type { ISlackAPI } from "../api/types";
import type { RTMEvent, RTMEventCallback } from "../types";
import { TIMING } from "../utils/constants";

export default class RTMClient {
	_slack: ISlackAPI | null;
	_ws: WebSocket | null;
	_listeners: Record<string, RTMEventCallback[]>;
	_pingTimer: ReturnType<typeof setInterval> | null;
	_pongTimer: ReturnType<typeof setTimeout> | null;
	_reconnectTimer: ReturnType<typeof setTimeout> | null;
	_reconnectAttempts: number;
	_messageId: number;
	_connected: boolean;
	_intentionalClose: boolean;

	constructor() {
		this._slack = null;
		this._ws = null;
		this._listeners = {};
		this._pingTimer = null;
		this._pongTimer = null;
		this._reconnectTimer = null;
		this._reconnectAttempts = 0;
		this._messageId = 0;
		this._connected = false;
		this._intentionalClose = false;
	}

	async connect(slack: ISlackAPI): Promise<void> {
		this._slack = slack;
		this._intentionalClose = false;
		await this._openConnection();
	}

	disconnect(): void {
		this._intentionalClose = true;
		this._cleanup();
		this._connected = false;
		this._emitStatus();
	}

	isConnected(): boolean {
		return this._connected;
	}

	on(type: string, cb: RTMEventCallback): void {
		if (!this._listeners[type]) {
			this._listeners[type] = [];
		}
		this._listeners[type].push(cb);
	}

	off(type: string, cb: RTMEventCallback): void {
		const list = this._listeners[type];
		if (!list) return;
		this._listeners[type] = list.filter(function (fn) {
			return fn !== cb;
		});
	}

	async _openConnection(): Promise<void> {
		if (!this._slack) return;
		try {
			const res = await this._slack.rtmConnect();
			const url = res.url as string;
			if (!url) throw new Error("No RTM URL returned");
			this._setupWebSocket(url);
		} catch (err: any) {
			console.warn("RTM connect failed:", err.message);
			this._scheduleReconnect();
		}
	}

	_setupWebSocket(url: string): void {
		const self = this;
		const ws = new WebSocket(url);

		ws.onopen = function () {
			self._connected = true;
			self._reconnectAttempts = 0;
			self._startPing();
			self._emitStatus();
		};

		ws.onmessage = function (event: MessageEvent) {
			try {
				const data: RTMEvent = JSON.parse(event.data as string);
				self._handleMessage(data);
			} catch (_e) {}
		};

		ws.onerror = function () {
			// onclose will fire after this
		};

		ws.onclose = function () {
			self._connected = false;
			self._stopPing();
			self._emitStatus();
			if (!self._intentionalClose) {
				self._scheduleReconnect();
			}
		};

		this._ws = ws;
	}

	_handleMessage(data: RTMEvent): void {
		if (data.type === "pong") {
			this._clearPongTimeout();
			return;
		}

		if (data.reply_to !== undefined) {
			return;
		}

		var type = data.type;
		var listeners = this._listeners[type];
		if (listeners) {
			for (var i = 0; i < listeners.length; i++) {
				try {
					listeners[i](data);
				} catch (_e) {}
			}
		}

		var allListeners = this._listeners["*"];
		if (allListeners) {
			for (var j = 0; j < allListeners.length; j++) {
				try {
					allListeners[j](data);
				} catch (_e) {}
			}
		}
	}

	_startPing(): void {
		this._stopPing();
		var self = this;
		this._pingTimer = setInterval(function () {
			self._sendPing();
		}, TIMING.RTM_PING_INTERVAL);
	}

	_stopPing(): void {
		if (this._pingTimer) {
			clearInterval(this._pingTimer);
			this._pingTimer = null;
		}
		this._clearPongTimeout();
	}

	_sendPing(): void {
		if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
		this._messageId++;
		var self = this;
		try {
			this._ws.send(JSON.stringify({ id: this._messageId, type: "ping" }));
		} catch (_e) {
			return;
		}
		this._pongTimer = setTimeout(function () {
			console.warn("RTM pong timeout, reconnecting");
			self._ws && self._ws.close();
		}, TIMING.RTM_PONG_TIMEOUT);
	}

	_clearPongTimeout(): void {
		if (this._pongTimer) {
			clearTimeout(this._pongTimer);
			this._pongTimer = null;
		}
	}

	_scheduleReconnect(): void {
		if (this._intentionalClose) return;
		if (this._reconnectTimer) return;
		var self = this;
		var delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), TIMING.RTM_MAX_BACKOFF);
		this._reconnectAttempts++;
		this._reconnectTimer = setTimeout(function () {
			self._reconnectTimer = null;
			self._openConnection();
		}, delay);
	}

	_cleanup(): void {
		this._stopPing();
		if (this._reconnectTimer) {
			clearTimeout(this._reconnectTimer);
			this._reconnectTimer = null;
		}
		if (this._ws) {
			try {
				this._ws.close();
			} catch (_e) {}
			this._ws = null;
		}
	}

	_emitStatus(): void {
		var listeners = this._listeners["_status"];
		if (listeners) {
			var event: RTMEvent = { type: "_status" };
			for (var i = 0; i < listeners.length; i++) {
				try {
					listeners[i](event);
				} catch (_e) {}
			}
		}
	}
}
