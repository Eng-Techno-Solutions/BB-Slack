import type { UsersMap } from "../types";
import { getUserName } from "./format";

// Slack sends and receives user mentions in the wire format `<@U123>` (or
// `<@U123|label>`). That is unreadable in a plain text composer, so we show a
// friendly `@Name` while typing and convert back only when sending.

const WIRE_MENTION = /<@([A-Z0-9]+)(?:\|[^>]*)?>/g;
const SPECIAL_MENTION = /<!(here|channel|everyone)(?:\|[^>]*)?>/g;

// Turn wire mentions into `@Name` for display in the composer (e.g. when
// editing an existing message whose text still holds `<@U123>`).
export function wireToDisplay(text: string, usersMap: UsersMap): string {
	return text
		.replace(WIRE_MENTION, function (_match: string, userId: string) {
			return "@" + getUserName(userId, usersMap);
		})
		.replace(SPECIAL_MENTION, function (_match: string, keyword: string) {
			return "@" + keyword;
		});
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Turn friendly `@Name` mentions back into `<@U123>` before sending. Labels are
// matched longest-first so "@Ammar Yaser" wins over a shorter "@Ammar".
export function displayToWire(text: string, usersMap: UsersMap): string {
	const labels: { label: string; id: string }[] = [];
	const keys = Object.keys(usersMap);
	for (let i = 0; i < keys.length; i++) {
		const user = usersMap[keys[i]];
		if (!user || user.deleted) continue;
		const display = user.profile && user.profile.display_name;
		if (display) labels.push({ label: display, id: keys[i] });
		if (user.real_name) labels.push({ label: user.real_name, id: keys[i] });
		if (user.name) labels.push({ label: user.name, id: keys[i] });
	}
	labels.sort(function (a, b) {
		return b.label.length - a.label.length;
	});

	let result = text;
	for (let i = 0; i < labels.length; i++) {
		// Only replace when the label ends on a word boundary so partial names
		// (e.g. "Ammar" inside "Ammar Yaser") don't get converted early.
		const pattern = new RegExp("@" + escapeRegex(labels[i].label) + "(?![\\w])", "g");
		result = result.replace(pattern, "<@" + labels[i].id + ">");
	}
	return result;
}
