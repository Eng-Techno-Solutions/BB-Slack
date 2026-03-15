import type { AccountEntry, SlackChannel, SlackUser } from "../types";
import { playNotification, saveAccounts } from "../utils";

export interface LoadChannelsResult {
	channels: SlackChannel[];
	changed: boolean;
}

export async function fetchAllUsers(slack: any): Promise<Record<string, SlackUser>> {
	const usersMap: Record<string, SlackUser> = {};
	let cursor = "";
	do {
		const res = await slack.usersList(cursor || undefined, 200);
		const members = res.members || [];
		for (let i = 0; i < members.length; i++) {
			usersMap[members[i].id] = members[i];
		}
		cursor =
			res.response_metadata && res.response_metadata.next_cursor
				? res.response_metadata.next_cursor
				: "";
	} while (cursor);
	return usersMap;
}

export async function fetchAllChannels(slack: any): Promise<SlackChannel[]> {
	let allChannels: SlackChannel[] = [];
	let cursor = "";
	do {
		const res = await slack.conversationsList(
			"public_channel,private_channel,mpim,im",
			cursor || undefined,
			200
		);
		allChannels = allChannels.concat(res.channels || []);
		cursor =
			res.response_metadata && res.response_metadata.next_cursor
				? res.response_metadata.next_cursor
				: "";
	} while (cursor);
	return allChannels;
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
	slack: any,
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

export async function fetchTeamIcon(slack: any): Promise<string> {
	const res = await slack.teamInfo();
	return res.team && res.team.icon ? res.team.icon.image_68 || res.team.icon.image_44 || "" : "";
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
