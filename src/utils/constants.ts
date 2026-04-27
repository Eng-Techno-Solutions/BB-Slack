export const STORAGE_KEYS = {
	TOKEN: "@BBSlack:token",
	THEME: "@BBSlack:theme",
	NOTIF_INTERVAL: "@BBSlack:notifInterval",
	NOTIF_ENABLED: "@BBSlack:notifEnabled",
	SOUND_ENABLED: "@BBSlack:soundEnabled",
	FONT_SIZE: "@BBSlack:fontSize",
	ACCOUNTS: "@BBSlack:accounts",
	ACTIVE_ACCOUNT: "@BBSlack:activeAccount"
} as const;

export const TIMING = {
	NOTIF_POLL_DEFAULT: 120000,
	CACHE_STALE_TIME: 30000,
	CACHE_GC_TIME: 300000,
	CACHE_GC_INTERVAL: 60000,
	RTM_PING_INTERVAL: 30000,
	RTM_PONG_TIMEOUT: 10000,
	RTM_MAX_BACKOFF: 30000,
	RTM_POLL_FALLBACK: 300000,
	CHAT_POLL_RTM_FALLBACK: 60000
} as const;

export const SCREENS = {
	LOGIN: "login",
	CHANNEL_LIST: "channelList",
	CHAT: "chat",
	THREAD: "thread",
	SEARCH: "search",
	CHANNEL_INFO: "channelInfo",
	SETTINGS: "settings",
	PROFILE: "profile"
} as const;

export const API = {
	SLACK_WEB: "https://slack.com/api/",
	SLACK_PROXY: "/slack-api/",
	SLACK_FILE_PROXY: "/slack-file"
} as const;
