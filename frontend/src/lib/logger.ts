import { browser, dev } from '$app/environment';
import { createConsola, LogLevels, type LogType } from 'consola';

const envLevel = browser ? import.meta.env.PUBLIC_LOG_LEVEL : process.env.LOG_LEVEL;
const defaultLevel = dev ? 'info' : 'warn';
const raw = String(envLevel || defaultLevel).toLowerCase();
const level =
	raw in LogLevels
		? LogLevels[raw as LogType]
		: /^\d+$/.test(raw)
			? Number(raw)
			: LogLevels.info;

const baseLogger = createConsola({
	level
}).withTag('frontend');

type LogMethod = 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'success';

function normalizeLocation(location: string): string {
	const clean = location.replace(/\\/g, '/');
	const srcIndex = clean.lastIndexOf('/src/');
	if (srcIndex >= 0) {
		return clean.slice(srcIndex + 5).replace(/\.(ts|tsx|js|mjs|cjs|svelte)$/, '');
	}
	return clean.split('/').pop()?.replace(/\.(ts|tsx|js|mjs|cjs|svelte)$/, '') || 'unknown';
}

function getCallerLocation(): string {
	const stack = new Error().stack || '';
	for (const line of stack.split('\n')) {
		if (
			line.includes('/lib/logger') ||
			line.includes('node:internal') ||
			line.includes('/node_modules/')
		) {
			continue;
		}
		const match =
			line.match(/\((.*):\d+:\d+\)/) ||
			line.match(/at (.*):\d+:\d+/) ||
			line.match(/@(.*):\d+:\d+/);
		if (match?.[1]) {
			return normalizeLocation(match[1]);
		}
	}
	return browser ? 'client' : 'server';
}

function emit(type: LogMethod, args: unknown[]): void {
	const scoped = baseLogger.withTag(getCallerLocation()) as Record<LogMethod, (...input: unknown[]) => void>;
	scoped[type](...args);
}

export const logger = {
	info: (...args: unknown[]) => emit('info', args),
	warn: (...args: unknown[]) => emit('warn', args),
	error: (...args: unknown[]) => emit('error', args),
	debug: (...args: unknown[]) => emit('debug', args),
	trace: (...args: unknown[]) => emit('trace', args),
	success: (...args: unknown[]) => emit('success', args)
};
