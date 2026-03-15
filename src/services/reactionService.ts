export interface ReactionAPI {
	reactionsAdd(channel: string, name: string, timestamp: string): Promise<unknown>;
	reactionsRemove(channel: string, name: string, timestamp: string): Promise<unknown>;
}

export async function toggleReaction(
	slack: ReactionAPI,
	channelId: string,
	ts: string,
	name: string,
	alreadyReacted: boolean
): Promise<void> {
	if (alreadyReacted) {
		await slack.reactionsRemove(channelId, name, ts);
	} else {
		await slack.reactionsAdd(channelId, name, ts);
	}
}
