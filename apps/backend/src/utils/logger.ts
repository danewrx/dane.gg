import '../loadEnv';
import { createConsola, LogLevels, type LogType } from 'consola';

const defaultLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'info';
const raw = (process.env.LOG_LEVEL || defaultLevel).toLowerCase();
const level = raw in LogLevels
	? LogLevels[raw as LogType]
	: /^\d+$/.test(raw)
		? Number(raw)
		: LogLevels.info;

const baseLogger = createConsola({
	level
});

type LogMethod = 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'success';
const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_SERVICE_COLORS = [
	'\x1b[38;5;39m',
	'\x1b[38;5;45m',
	'\x1b[38;5;75m',
	'\x1b[38;5;111m',
	'\x1b[38;5;141m',
	'\x1b[38;5;171m',
	'\x1b[38;5;208m',
	'\x1b[38;5;214m'
];

function normalizeLocation(location: string): string {
	const clean = location.replace(/\\/g, '/');
	const srcIndex = clean.lastIndexOf('/src/');
	if (srcIndex >= 0) {
		return clean.slice(srcIndex + 5).replace(/\.(ts|tsx|js|mjs|cjs)$/, '');
	}
	return clean.split('/').pop()?.replace(/\.(ts|tsx|js|mjs|cjs)$/, '') || 'unknown';
}

function getCallerLocation(): string {
	const stack = new Error().stack || '';
	for (const line of stack.split('\n')) {
		if (
			line.includes('/utils/logger') ||
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
	return 'unknown';
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

function styleService(service: string): string {
	const color = ANSI_SERVICE_COLORS[hashService(service) % ANSI_SERVICE_COLORS.length];
	return `${color}${ANSI_BOLD}[${service}]${ANSI_RESET}`;
}

function emit(type: LogMethod, args: unknown[]): void {
	const scoped = baseLogger as Record<LogMethod, (...input: unknown[]) => void>;
	const service = formatService(getCallerLocation());
	const prefix = styleService(service);
	if (typeof args[0] === 'string') {
		scoped[type](`${prefix} ${args[0]}`, ...args.slice(1));
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
