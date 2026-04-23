import '../loadEnv';
import { createConsola, LogLevels, type LogType } from 'consola';

const defaultLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'info';
const raw = (process.env.LOG_LEVEL || defaultLevel).toLowerCase();
const level = raw in LogLevels
	? LogLevels[raw as LogType]
	: /^\d+$/.test(raw)
		? Number(raw)
		: LogLevels.info;

export const logger = createConsola({
	level
}).withTag('backend');
