import crypto from "crypto";
import type { IncomingMessage, ServerResponse } from "http";

interface SlackEvent {
	type: string;
	challenge?: string;
	token?: string;
	event?: {
		type: string;
		subtype?: string;
		channel?: string;
		user?: string;
		text?: string;
		channel_type?: string;
		bot_id?: string;
	};
}

function verifySlackSignature(
	signingSecret: string,
	timestamp: string,
	body: string,
	signature: string
): boolean {
	const baseString = "v0:" + timestamp + ":" + body;
	const hmac = crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex");
	const expected = "v0=" + hmac;
	return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise(function (resolve, reject) {
		const chunks: Buffer[] = [];
		req.on("data", function (chunk: Buffer) {
			chunks.push(chunk);
		});
		req.on("end", function () {
			resolve(Buffer.concat(chunks).toString("utf8"));
		});
		req.on("error", reject);
	});
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.end("Method Not Allowed");
		return;
	}

	const signingSecret = process.env.SLACK_SIGNING_SECRET;
	const ntfyTopic = process.env.NTFY_TOPIC;
	const slackUserId = process.env.SLACK_USER_ID;

	if (!signingSecret || !ntfyTopic) {
		res.statusCode = 500;
		res.end("Missing environment variables");
		return;
	}

	const rawBody = await readBody(req);
	const headers = req.headers;
	const timestamp = (headers["x-slack-request-timestamp"] as string) || "";
	const slackSignature = (headers["x-slack-signature"] as string) || "";

	// Reject requests older than 5 minutes
	const now = Math.floor(Date.now() / 1000);
	if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
		res.statusCode = 403;
		res.end("Request too old");
		return;
	}

	if (!verifySlackSignature(signingSecret, timestamp, rawBody, slackSignature)) {
		res.statusCode = 403;
		res.end("Invalid signature");
		return;
	}

	let payload: SlackEvent;
	try {
		payload = JSON.parse(rawBody);
	} catch (_e) {
		res.statusCode = 400;
		res.end("Invalid JSON");
		return;
	}

	// Handle Slack URL verification challenge
	if (payload.type === "url_verification") {
		res.setHeader("Content-Type", "application/json");
		res.statusCode = 200;
		res.end(JSON.stringify({ challenge: payload.challenge }));
		return;
	}

	// Process event callbacks
	if (payload.type === "event_callback" && payload.event) {
		const event = payload.event;

		// Skip bot messages and messages from the user themselves
		if (event.bot_id || event.user === slackUserId) {
			res.statusCode = 200;
			res.end("ok");
			return;
		}

		// Only notify for message events
		if (event.type === "message" && !event.subtype) {
			const channel = event.channel || "unknown";
			const user = event.user || "someone";
			const text = event.text || "";
			const preview = text.length > 100 ? text.substring(0, 100) + "..." : text;

			const ntfyUrl = "https://ntfy.sh/" + ntfyTopic;
			try {
				await fetch(ntfyUrl, {
					method: "POST",
					headers: {
						Title: "New message in " + channel,
						Tags: "speech_balloon"
					},
					body: user + ": " + preview
				});
			} catch (err) {
				console.error("Failed to send ntfy notification:", err);
			}
		}
	}

	res.statusCode = 200;
	res.end("ok");
}
