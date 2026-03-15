import type { SlackMessage } from "../types";

export interface MergeResult {
	messages: SlackMessage[];
	hasNew: boolean;
	changed: boolean;
}

export function mergeMessages(existing: SlackMessage[], fetched: SlackMessage[]): MergeResult {
	if (fetched.length === 0) {
		return { messages: existing, hasNew: false, changed: false };
	}

	const existingMap: Record<string, boolean> = {};
	for (let i = 0; i < existing.length; i++) {
		existingMap[existing[i].ts] = true;
	}

	let hasNew = false;
	for (let j = 0; j < fetched.length; j++) {
		if (!existingMap[fetched[j].ts]) {
			hasNew = true;
			break;
		}
	}

	const fetchedMap: Record<string, SlackMessage> = {};
	for (let k = 0; k < fetched.length; k++) {
		fetchedMap[fetched[k].ts] = fetched[k];
	}

	const merged: SlackMessage[] = [];
	for (let n = 0; n < fetched.length; n++) {
		if (!existingMap[fetched[n].ts]) {
			merged.push(fetched[n]);
		}
	}
	for (let m = 0; m < existing.length; m++) {
		if (fetchedMap[existing[m].ts]) {
			merged.push(fetchedMap[existing[m].ts]);
		} else {
			merged.push(existing[m]);
		}
	}

	const changed = hasMessagesChanged(existing, merged);
	return { messages: merged, hasNew: hasNew, changed: changed };
}

export function hasMessagesChanged(a: SlackMessage[], b: SlackMessage[]): boolean {
	if (a.length !== b.length) return true;
	for (let i = 0; i < a.length; i++) {
		if (
			a[i].ts !== b[i].ts ||
			a[i].text !== b[i].text ||
			(a[i].reactions || []).length !== (b[i].reactions || []).length ||
			a[i].reply_count !== b[i].reply_count
		) {
			return true;
		}
	}
	return false;
}
