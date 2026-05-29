import type { RTMEvent } from "../types";
import type RTMClient from "./rtmClient";

type ChannelHandlerMap = Record<string, () => void>;

type RegisterArgs = {
	rtm: RTMClient;
	handlers: ChannelHandlerMap;
	currentUserId: () => string | null;
	onChannelsChanged: () => void;
	onStatusChanged: (connected: boolean) => void;
};

// Wires the standard set of RTM event listeners shared by both app entry points.
// The caller owns the channel-level handler map and provides callbacks for the
// two side-effects we care about: reloading the channel list and reacting to
// connection-status changes (so polling cadence can adapt).
export function registerRTMHandlers(args: RegisterArgs): void {
	const { rtm, handlers, currentUserId, onChannelsChanged, onStatusChanged } = args;

	rtm.on("message", function (event: RTMEvent) {
		const channelId = event.channel;
		if (!channelId) return;
		const handler = handlers[channelId];
		if (handler) {
			handler();
			return;
		}
		if (event.user !== currentUserId()) {
			onChannelsChanged();
		}
	});

	const forwardItemEvent = function (event: RTMEvent): void {
		const item = event.item;
		if (item && item.channel) {
			const handler = handlers[item.channel];
			if (handler) handler();
		}
	};

	rtm.on("reaction_added", forwardItemEvent);
	rtm.on("reaction_removed", forwardItemEvent);

	rtm.on("channel_marked", onChannelsChanged);
	rtm.on("group_marked", onChannelsChanged);
	rtm.on("im_marked", onChannelsChanged);

	rtm.on("_status", function () {
		onStatusChanged(rtm.isConnected());
	});
}
