import type { UsersMap } from "../types";

const AVATAR_COLORS: string[] = [
	"#E8912D",
	"#2BAC76",
	"#CD2553",
	"#1264A3",
	"#9B59B6",
	"#E74C3C",
	"#00BCD4",
	"#4A154B",
	"#3498DB",
	"#E67E22",
	"#1ABC9C",
	"#8E44AD"
];

function hashCode(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash = hash & hash;
	}
	return Math.abs(hash);
}

export function getAvatarColor(userId: string): string {
	return AVATAR_COLORS[hashCode(userId || "") % AVATAR_COLORS.length];
}

export function getProfileImage(userId: string, usersMap: UsersMap): string | null {
	const u = usersMap[userId];
	if (u && u.profile) {
		return u.profile.image_72 || u.profile.image_48 || null;
	}
	return null;
}
