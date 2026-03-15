import type { StackEntry } from "../types";

export function pushScreen(
	stack: StackEntry[],
	screen: string,
	params?: Record<string, any>
): StackEntry[] {
	return stack.concat([{ screen: screen, params: params || {} }]);
}

export function popScreen(stack: StackEntry[]): StackEntry[] | null {
	if (stack.length <= 1) return null;
	return stack.slice(0, -1);
}

export function replaceTopScreen(
	stack: StackEntry[],
	screen: string,
	params?: Record<string, any>
): StackEntry[] {
	const newStack = stack.slice(0, -1);
	newStack.push({ screen: screen, params: params || {} });
	return newStack;
}

export function getCurrentScreen(stack: StackEntry[]): StackEntry {
	return stack[stack.length - 1];
}

export function getActiveChannelId(stack: StackEntry[]): string | null {
	const current = stack[stack.length - 1];
	if (current.screen === "chat" && current.params && current.params.channel) {
		return current.params.channel.id;
	}
	return null;
}
