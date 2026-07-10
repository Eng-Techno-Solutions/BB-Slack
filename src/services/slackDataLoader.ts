import type { ISlackAPI } from "../api/types";
import type { AccountEntry, SlackChannel, SlackUser } from "../types";
import { playNotification, saveAccounts } from "../utils";

export interface LoadChannelsResult {
	channels: SlackChannel[];
	changed: boolean;
}

export async function fetchAllUsers(slack: ISlackAPI): Promise<Record<string, SlackUser>> {
	const usersMap: Record<string, SlackUser> = {};
	let cursor = "";
	do {
		const res = await slack.usersList(cursor || undefined, 200);
		const members = (res.members as SlackUser[]) || [];
		for (let i = 0; i < members.length; i++) {
			usersMap[members[i].id] = members[i];
		}
		const meta = res.response_metadata as { next_cursor?: string } | undefined;
		cursor = meta && meta.next_cursor ? meta.next_cursor : "";
	} while (cursor);
	return usersMap;
}

// conversations.list never returns unread_count_display; Slack only exposes
// it through users.counts (all conversation types, one call) or
// conversations.info (DMs/group DMs only, one call each).
const MAX_DM_UNREAD_LOOKUPS = 30;

interface CountsEntry {
	id?: string;
	unread_count_display?: number;
	dm_count?: number;
	mention_count_display?: number;
}

function buildCountsMap(res: Record<string, unknown>): Record<string, number> {
	const countsMap: Record<string, number> = {};
	const groups = [res.channels, res.groups, res.mpims, res.ims];
	for (let g = 0; g < groups.length; g++) {
		const entries = (groups[g] as CountsEntry[]) || [];
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if (!entry.id) continue;
			// Field name varies by conversation type: channels/groups use
			// unread_count_display, ims use dm_count.
			const count = entry.unread_count_display || entry.dm_count || entry.mention_count_display || 0;
			if (count > 0) countsMap[entry.id] = count;
		}
	}
	return countsMap;
}

async function enrichDmUnreadCounts(
	slack: ISlackAPI,
	channels: SlackChannel[]
): Promise<SlackChannel[]> {
	const dms = channels.filter(function (ch: SlackChannel) {
		return ch.is_im || ch.is_mpim;
	});
	const lookups = dms.slice(0, MAX_DM_UNREAD_LOOKUPS).map(async function (dm: SlackChannel) {
		try {
			const res = await slack.conversationsInfo(dm.id);
			const info = res.channel as SlackChannel | undefined;
			if (info && typeof info.unread_count_display === "number") {
				dm.unread_count_display = info.unread_count_display;
			}
		} catch (_e) {
			// Unread badge is best-effort; a failed lookup keeps the count at 0
		}
	});
	await Promise.all(lookups);
	return channels;
}

async function enrichUnreadCounts(
	slack: ISlackAPI,
	channels: SlackChannel[]
): Promise<SlackChannel[]> {
	try {
		const res = await slack.usersCounts();
		const countsMap = buildCountsMap(res);
		for (let i = 0; i < channels.length; i++) {
			channels[i].unread_count_display = countsMap[channels[i].id] || 0;
		}
		return channels;
	} catch (_e) {
		// users.counts is undocumented; if this token can't use it, fall back
		// to the documented per-DM lookup (channels stay at 0).
		return enrichDmUnreadCounts(slack, channels);
	}
}

export async function fetchAllChannels(slack: ISlackAPI): Promise<SlackChannel[]> {
	let allChannels: SlackChannel[] = [];
	let cursor = "";
	do {
		const res = await slack.conversationsList(
			"public_channel,private_channel,mpim,im",
			cursor || undefined,
			200
		);
		allChannels = allChannels.concat((res.channels as SlackChannel[]) || []);
		const meta = res.response_metadata as { next_cursor?: string } | undefined;
		cursor = meta && meta.next_cursor ? meta.next_cursor : "";
	} while (cursor);
	return enrichUnreadCounts(slack, allChannels);
}

export function detectNewUnreads(
	oldChannels: SlackChannel[],
	newChannels: SlackChannel[],
	activeChannelId: string | null
): boolean {
	const oldUnreadMap: Record<string, number> = {};
	for (let i = 0; i < oldChannels.length; i++) {
		oldUnreadMap[oldChannels[i].id] = oldChannels[i].unread_count_display || 0;
	}
	for (let j = 0; j < newChannels.length; j++) {
		const ch = newChannels[j];
		const oldCount = oldUnreadMap[ch.id] || 0;
		const newCount = ch.unread_count_display || 0;
		if (newCount > oldCount && ch.id !== activeChannelId) {
			return true;
		}
	}
	return false;
}

export function hasChannelDataChanged(
	oldChannels: SlackChannel[],
	newChannels: SlackChannel[]
): boolean {
	if (newChannels.length !== oldChannels.length) return true;
	const oldUnread: Record<string, number> = {};
	for (let i = 0; i < oldChannels.length; i++) {
		oldUnread[oldChannels[i].id] = oldChannels[i].unread_count_display || 0;
	}
	for (let j = 0; j < newChannels.length; j++) {
		if ((newChannels[j].unread_count_display || 0) !== (oldUnread[newChannels[j].id] || 0)) {
			return true;
		}
	}
	return false;
}

export async function loadChannelsWithUnreadDetection(
	slack: ISlackAPI,
	oldChannels: SlackChannel[],
	activeChannelId: string | null
): Promise<LoadChannelsResult> {
	const allChannels = await fetchAllChannels(slack);
	const isFirstLoad = oldChannels.length === 0;

	if (!isFirstLoad && oldChannels.length > 0) {
		if (detectNewUnreads(oldChannels, allChannels, activeChannelId)) {
			playNotification();
		}
	}

	const changed = isFirstLoad || hasChannelDataChanged(oldChannels, allChannels);
	return { channels: allChannels, changed: changed };
}

export async function fetchTeamIcon(slack: ISlackAPI): Promise<string> {
	const res = await slack.teamInfo();
	const team = res.team as { icon?: { image_68?: string; image_44?: string } } | undefined;
	return team && team.icon ? team.icon.image_68 || team.icon.image_44 || "" : "";
}

export async function updateAccountTeamIcon(
	accounts: AccountEntry[],
	currentUserId: string,
	icon: string
): Promise<AccountEntry[]> {
	const updated = accounts.slice();
	const idx = updated.findIndex(function (a: AccountEntry) {
		return a.userId === currentUserId;
	});
	if (idx >= 0 && updated[idx].teamIcon !== icon) {
		updated[idx] = Object.assign({}, updated[idx], { teamIcon: icon });
		try {
			await saveAccounts(updated);
		} catch (_e) {}
		return updated;
	}
	return accounts;
}
