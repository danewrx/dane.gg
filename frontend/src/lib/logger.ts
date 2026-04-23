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

export const logger = createConsola({
	level
}).withTag('frontend');
