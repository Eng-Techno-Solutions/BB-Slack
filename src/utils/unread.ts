import type { SlackChannel, SlackUser } from "../types";

// Sums the display unread count across every channel/DM. Shared by the
// ChannelList header badge and the app-wide global unread indicator so the
// two never drift.
export function getTotalUnread(channels: SlackChannel[]): number {
	let total = 0;
	for (let i = 0; i < channels.length; i++) {
		total += channels[i].unread_count_display || 0;
	}
	return total;
}

// Human-readable label for a channel/DM, used by the in-app message banner.
// Mirrors the naming shown in the channel list: "#name" for channels,
// the member's name for DMs.
export function getChannelLabel(
	channel: SlackChannel,
	usersMap: Record<string, SlackUser>
): string {
	if (channel.is_im) {
		const user = usersMap[channel.user || ""];
		const name =
			(user && ((user.profile && user.profile.display_name) || user.real_name || user.name)) ||
			"Direct message";
		return name;
	}
	return "#" + (channel.name || channel.name_normalized || "channel");
}
