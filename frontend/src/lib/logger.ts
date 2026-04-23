import { browser } from '$app/environment';
import { createConsola, LogLevels, type LogType } from 'consola';

const raw = String(
	(browser ? import.meta.env.PUBLIC_LOG_LEVEL : process.env.LOG_LEVEL) || 'info'
).toLowerCase();
const level =
	raw in LogLevels
		? LogLevels[raw as LogType]
		: /^\d+$/.test(raw)
			? Number(raw)
			: LogLevels.info;

export const logger = createConsola({
	level
}).withTag('frontend');
