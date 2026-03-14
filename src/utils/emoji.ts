import { Platform } from "react-native";

export const EMOJI_MAP: Record<string, string> = {
	// Smileys & Emotion
	grinning: "\u{1F600}",
	smiley: "\u{1F603}",
	smile: "\u{1F604}",
	grin: "\u{1F601}",
	laughing: "\u{1F606}",
	satisfied: "\u{1F606}",
	sweat_smile: "\u{1F605}",
	rofl: "\u{1F923}",
	rolling_on_the_floor_laughing: "\u{1F923}",
	joy: "\u{1F602}",
	face_with_tears_of_joy: "\u{1F602}",
	slightly_smiling_face: "\u{1F642}",
	upside_down_face: "\u{1F643}",
	melting_face: "\u{1FAE0}",
	wink: "\u{1F609}",
	blush: "\u{1F60A}",
	innocent: "\u{1F607}",
	smiling_face_with_three_hearts: "\u{1F970}",
	heart_eyes: "\u{1F60D}",
	star_struck: "\u{1F929}",
	kissing_heart: "\u{1F618}",
	kissing: "\u{1F617}",
	relaxed: "\u263A\uFE0F",
	kissing_closed_eyes: "\u{1F61A}",
	kissing_smiling_eyes: "\u{1F619}",
	smiling_face_with_tear: "\u{1F972}",
	yum: "\u{1F60B}",
	stuck_out_tongue: "\u{1F61B}",
	stuck_out_tongue_winking_eye: "\u{1F61C}",
	zany_face: "\u{1F92A}",
	stuck_out_tongue_closed_eyes: "\u{1F61D}",
	money_mouth_face: "\u{1F911}",
	hugs: "\u{1F917}",
	hugging_face: "\u{1F917}",
	hand_over_mouth: "\u{1F92D}",
	shushing_face: "\u{1F92B}",
	thinking_face: "\u{1F914}",
	thinking: "\u{1F914}",
	saluting_face: "\u{1FAE1}",
	zipper_mouth_face: "\u{1F910}",
	raised_eyebrow: "\u{1F928}",
	neutral_face: "\u{1F610}",
	expressionless: "\u{1F611}",
	no_mouth: "\u{1F636}",
	dotted_line_face: "\u{1FAE5}",
	face_in_clouds: "\u{1F636}\u200D\u{1F32B}\uFE0F",
	smirk: "\u{1F60F}",
	unamused: "\u{1F612}",
	rolling_eyes: "\u{1F644}",
	grimacing: "\u{1F62C}",
	face_exhaling: "\u{1F62E}\u200D\u{1F4A8}",
	lying_face: "\u{1F925}",
	shaking_face: "\u{1FAE8}",
	relieved: "\u{1F60C}",
	pensive: "\u{1F614}",
	sleepy: "\u{1F62A}",
	drooling_face: "\u{1F924}",
	sleeping: "\u{1F634}",
	mask: "\u{1F637}",
	face_with_thermometer: "\u{1F912}",
	face_with_head_bandage: "\u{1F915}",
	nauseated_face: "\u{1F922}",
	face_vomiting: "\u{1F92E}",
	sneezing_face: "\u{1F927}",
	hot_face: "\u{1F975}",
	cold_face: "\u{1F976}",
	woozy_face: "\u{1F974}",
	dizzy_face: "\u{1F635}",
	face_with_spiral_eyes: "\u{1F635}\u200D\u{1F4AB}",
	exploding_head: "\u{1F92F}",
	cowboy_hat_face: "\u{1F920}",
	partying_face: "\u{1F973}",
	disguised_face: "\u{1F978}",
	sunglasses: "\u{1F60E}",
	nerd_face: "\u{1F913}",
	face_with_monocle: "\u{1F9D0}",
	confused: "\u{1F615}",
	worried: "\u{1F61F}",
	slightly_frowning_face: "\u{1F641}",
	frowning_face: "\u2639\uFE0F",
	open_mouth: "\u{1F62E}",
	hushed: "\u{1F62F}",
	astonished: "\u{1F632}",
	flushed: "\u{1F633}",
	pleading_face: "\u{1F97A}",
	face_holding_back_tears: "\u{1F979}",
	frowning: "\u{1F626}",
	anguished: "\u{1F627}",
	fearful: "\u{1F628}",
	cold_sweat: "\u{1F630}",
	disappointed_relieved: "\u{1F625}",
	cry: "\u{1F622}",
	sob: "\u{1F62D}",
	scream: "\u{1F631}",
	confounded: "\u{1F616}",
	persevere: "\u{1F623}",
	disappointed: "\u{1F61E}",
	sweat: "\u{1F613}",
	weary: "\u{1F629}",
	tired_face: "\u{1F62B}",
	yawning_face: "\u{1F971}",
	triumph: "\u{1F624}",
	rage: "\u{1F621}",
	pout: "\u{1F621}",
	angry: "\u{1F620}",
	face_with_symbols_on_mouth: "\u{1F92C}",
	cursing_face: "\u{1F92C}",
	smiling_imp: "\u{1F608}",
	imp: "\u{1F47F}",
	skull: "\u{1F480}",
	skull_and_crossbones: "\u2620\uFE0F",
	hankey: "\u{1F4A9}",
	poop: "\u{1F4A9}",
	shit: "\u{1F4A9}",
	clown_face: "\u{1F921}",
	japanese_ogre: "\u{1F479}",
	japanese_goblin: "\u{1F47A}",
	ghost: "\u{1F47B}",
	alien: "\u{1F47D}",
	space_invader: "\u{1F47E}",
	robot_face: "\u{1F916}",
	robot: "\u{1F916}",
	smiley_cat: "\u{1F63A}",
	smile_cat: "\u{1F638}",
	joy_cat: "\u{1F639}",
	heart_eyes_cat: "\u{1F63B}",
	smirk_cat: "\u{1F63C}",
	kissing_cat: "\u{1F63D}",
	scream_cat: "\u{1F640}",
	crying_cat_face: "\u{1F63F}",
	pouting_cat: "\u{1F63E}",
	see_no_evil: "\u{1F648}",
	hear_no_evil: "\u{1F649}",
	speak_no_evil: "\u{1F64A}"
};

export function emojiFromName(name: string): string | null {
	return EMOJI_MAP[name] || null;
}

export function replaceEmojisInText(text: string | null | undefined): string | null | undefined {
	if (!text) return text;
	// BB Q20 Android has no emoji font - keep shortcodes readable
	if (Platform.OS === "android") return text;
	return text.replace(/:([a-zA-Z0-9_+-]+):/g, function (match: string, name: string): string {
		const emoji = EMOJI_MAP[name];
		return emoji || match;
	});
}

export function getTwemojiUrl(emoji: string): string | null {
	try {
		if (!emoji || typeof emoji !== "string") return null;
		const codepoints: string[] = [];
		for (let i = 0; i < emoji.length; ) {
			const cp = emoji.codePointAt(i);
			if (cp === undefined) break;
			i += cp > 0xffff ? 2 : 1;
			if (cp !== 0xfe0f && cp !== 0xfe0e) {
				codepoints.push(cp.toString(16));
			}
		}
		if (codepoints.length === 0) return null;
		return (
			"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/" +
			codepoints.join("-") +
			".png"
		);
	} catch (e) {
		return null;
	}
}

export function getTwemojiUrlByName(name: string): string | null {
	const emoji = EMOJI_MAP[name];
	if (!emoji) return null;
	return getTwemojiUrl(emoji);
}
