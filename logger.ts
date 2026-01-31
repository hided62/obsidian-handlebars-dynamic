declare const __DEBUG__: boolean;

const PREFIX = '[handlebars-dynamic]';
const DEBUG_PREFIX = `${PREFIX}[debug]`;
const WARN_PREFIX = `${PREFIX}[warn]`;

export const DEBUG = __DEBUG__;

export function debugLog(...args: unknown[]) {
	if (!DEBUG) {
		return;
	}
	console.debug(DEBUG_PREFIX, ...args);
}

export function debugWarn(...args: unknown[]) {
	if (!DEBUG) {
		return;
	}
	console.warn(DEBUG_PREFIX, ...args);
}

export function warn(...args: unknown[]) {
	console.warn(WARN_PREFIX, ...args);
}
