import '../loadEnv';
import { createConsola, LogLevels, type LogType } from 'consola';

const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
const level = raw in LogLevels
	? LogLevels[raw as LogType]
	: /^\d+$/.test(raw)
		? Number(raw)
		: LogLevels.info;

export const logger = createConsola({
	level
}).withTag('backend');
