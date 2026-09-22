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
});

type LogMethod = 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'success';
const BROWSER_SERVICE_COLORS = [
	'#38bdf8',
	'#22d3ee',
	'#60a5fa',
	'#818cf8',
	'#a78bfa',
	'#f472b6',
	'#fb7185',
	'#f59e0b'
];

function normalizeLocation(location: string): string {
	const clean = location.replace(/\\/g, '/').split('?')[0].split('#')[0];
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

function formatService(location: string): string {
	const base = location.split('/').filter(Boolean).pop() || 'unknown';
	return base.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function hashService(service: string): number {
	let hash = 0;
	for (let i = 0; i < service.length; i += 1) {
		hash = (hash * 31 + service.charCodeAt(i)) >>> 0;
	}
	return hash;
}

function styleForService(service: string): string {
	return `color: ${BROWSER_SERVICE_COLORS[hashService(service) % BROWSER_SERVICE_COLORS.length]}; font-weight: 700;`;
}

function emit(type: LogMethod, args: unknown[]): void {
	const scoped = baseLogger as Record<LogMethod, (...input: unknown[]) => void>;
	const service = formatService(getCallerLocation());
	const prefix = `[${service}]`;
	if (typeof args[0] === 'string') {
		if (browser) {
			scoped[type](`%c${prefix}%c ${args[0]}`, styleForService(service), '', ...args.slice(1));
			return;
		}
		scoped[type](`${prefix} ${args[0]}`, ...args.slice(1));
		return;
	}
	if (browser) {
		scoped[type](`%c${prefix}%c`, styleForService(service), '', ...args);
		return;
	}
	scoped[type](prefix, ...args);
}

export const logger = {
	info: (...args: unknown[]) => emit('info', args),
	warn: (...args: unknown[]) => emit('warn', args),
	error: (...args: unknown[]) => emit('error', args),
	debug: (...args: unknown[]) => emit('debug', args),
	trace: (...args: unknown[]) => emit('trace', args),
	success: (...args: unknown[]) => emit('success', args)
};
