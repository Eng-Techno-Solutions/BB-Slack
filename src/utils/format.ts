export interface SlackUser {
	profile?: {
		display_name?: string;
		[key: string]: unknown;
	};
	real_name?: string;
	name?: string;
	[key: string]: unknown;
}

export interface SlackChannel {
	is_im?: boolean;
	is_mpim?: boolean;
	user?: string;
	name?: string;
	name_normalized?: string;
	purpose?: {
		value?: string;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

export type UsersMap = Record<string, SlackUser>;

export function formatTime(ts: string): string {
	const date = new Date(parseFloat(ts) * 1000);
	let hours = date.getHours();
	const mins = date.getMinutes();
	const ampm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12;
	if (hours === 0) hours = 12;
	const m = mins < 10 ? "0" + mins : "" + mins;
	return hours + ":" + m + " " + ampm;
}

export function formatDate(ts: string): string {
	const date = new Date(parseFloat(ts) * 1000);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diff = (today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24);

	if (diff === 0) return "Today";
	if (diff === 1) return "Yesterday";
	if (diff < 7) {
		const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
		return days[date.getDay()];
	}

	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec"
	];
	return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
}

export function formatDateFull(ts: string): string {
	return formatDate(ts) + " at " + formatTime(ts);
}

export function getUserName(user: string | null | undefined, usersMap: UsersMap): string {
	if (!user) return "Unknown";
	const u = usersMap[user];
	if (!u) return user;
	return u.profile && u.profile.display_name
		? u.profile.display_name
		: u.real_name || u.name || user;
}

export function getChannelDisplayName(
	channel: SlackChannel,
	usersMap: UsersMap,
	_currentUserId?: string
): string {
	if (channel.is_im) {
		return getUserName(channel.user, usersMap);
	}
	if (channel.is_mpim) {
		return channel.purpose && channel.purpose.value
			? channel.purpose.value
			: channel.name_normalized || channel.name || "";
	}
	return channel.name_normalized || channel.name || "";
}
