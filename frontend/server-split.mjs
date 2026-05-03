import http from 'node:http';
import os from 'node:os';
import { createConsola, LogLevels } from 'consola';
import { handler } from './build/handler.js';
import httpProxy from 'http-proxy';

const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
const level =
	raw in LogLevels ? LogLevels[raw] : /^\d+$/.test(raw) ? Number(raw) : LogLevels.info;
const logger = createConsola({ level }).withTag('frontend');

const port = Number(process.env.FRONTEND_PORT || process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const backend = (process.env.BACKEND_INTERNAL_URL || 'http://backend:3001').replace(/\/$/, '');

const proxyPaths = ['/api', '/webhooks', '/ws', '/uploads', '/emojis', '/chat-sounds'];

function shouldProxy(urlPath) {
	return proxyPaths.some((p) => urlPath === p || urlPath.startsWith(`${p}/`) || urlPath.startsWith(`${p}?`));
}

const proxy = httpProxy.createProxyServer({
	target: backend,
	ws: true,
	changeOrigin: true
});

proxy.on('error', (err, _req, res) => {
	logger.error('[proxy]', err.message);
	if (res && !res.headersSent && typeof res.writeHead === 'function') {
		res.writeHead(502, { 'Content-Type': 'text/plain' });
		res.end('Bad gateway (upstream API)');
	}
});

const server = http.createServer((req, res) => {
	const path = req.url?.split('?')[0] || '';
	if (shouldProxy(path)) {
		proxy.web(req, res, { target: backend });
		return;
	}
	handler(req, res, () => {
		if (!res.writableEnded) {
			res.statusCode = 404;
			res.end('Not found');
		}
	});
});

server.on('upgrade', (req, socket, head) => {
	const path = req.url?.split('?')[0] || '';
	if (shouldProxy(path)) {
		proxy.ws(req, socket, head, { target: backend });
		return;
	}
	socket.destroy();
});

function buildBanner(service, portNum, hostAddr, proxyTarget) {
	const c = {
		r: '\x1b[0m',
		cyan: '\x1b[36m',
		blue: '\x1b[94m',
		bBlue: '\x1b[1m\x1b[94m',
		dim: '\x1b[2m',
		white: '\x1b[1m\x1b[37m',
		yellow: '\x1b[33m',
		green: '\x1b[32m'
	};

	const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
	const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
	const cpus = os.cpus();
	const cpuModel = cpus[0]?.model?.replace(/\s+/g, ' ').trim() ?? 'Unknown';

	const info = [
		['Service', service],
		['Host', `${hostAddr}:${portNum}`],
		['Proxy', proxyTarget],
		['Runtime', `Node ${process.version}`],
		['Platform', `${os.platform()} ${os.arch()}`],
		['Hostname', os.hostname()],
		['CPU', `${cpuModel} (${cpus.length} cores)`],
		['Memory', `${freeMem} GB free / ${totalMem} GB total`],
		['PID', `${process.pid}`]
	];

	const art = [
		'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣄⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
		'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠳⣄⠀⠀⠀⠀⠀⠀⠀⠀',
		'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀',
		'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣠⣤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⣠⠎⠀⠀⠀⠀⠀⠀⠀⠀',
		'⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣖⡉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
		'⠀⠀⢠⣄⣀⣠⣤⣤⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣄⠀⠀⠀⠀⠀⠀⠀⠀',
		'⠀⠀⠀⠉⠻⣿⣿⣿⣿⣿⣿⣯⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀',
		'⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀⠀⠀⠀',
		'⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀⠀⠀',
		'⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀',
		'⠀⠀⣰⣿⣿⣿⣿⣿⣿⣿⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀',
		'⠠⣾⣿⢿⣿⣿⣿⣿⡿⠁⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠉⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣯⠉⠀⠀',
		'⠀⠀⠀⢸⣿⣿⣿⡿⠑⠊⣿⣿⡿⠿⠛⠛⠙⠛⣻⣿⣿⣄⡻⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀',
		'⠀⠀⠀⢸⣿⣿⣿⡗⠾⠛⠉⠉⠀⠀⠀⠀⠀⠀⠈⠉⠉⠙⠛⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀⠀',
		'⠀⠀⠀⢸⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⠟⠛⠻⣿⣿⣿⣿⣿⣿⡄⠀',
		'⠀⠀⠀⠀⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⢶⡋⠳⢸⣿⣿⣿⣿⣿⣇⠀',
		'⠀⠂⠀⠀⠘⣿⣿⣿⡀⠀⠀⠀⠀⠀⠉⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⡗⠚⢁⣠⣾⣿⣿⣿⣿⣿⣿⠀',
		'⠀⠉⠀⠀⠀⠈⣻⣿⣿⣦⣄⣀⡀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣾⣿⣿⣿⣷⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄',
		'⠀⠀⠀⢺⣿⠤⠿⢿⣿⣿⣿⣿⣿⣿⣷⣶⡄⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇',
		'⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⢿⣿⣿⣿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇',
		'⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⣿⣿⣿⠟⠁⠀⣀⡠⠜⠋⠁⠀⠀⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁',
		'⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡿⠛⣠⣟⣁⠤⠖⠋⠁⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠀',
		'⠀⠀⠀⠀⠀⠀⣿⣿⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⣿⣿⡟⢸⠿⠃⠀',
		'⠀⠀⠀⠀⠀⠀⢸⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢦⠀⠀⠀⠀⠀⠀⠀',
		'⠀⠀⠀⠀⠀⠀⡼⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣆⠀⠀⠀⠀⠀⠀'
	];

	const infoStart = Math.floor((art.length - info.length) / 2);
	const maxLabel = Math.max(...info.map(([l]) => l.length));
	const lines = [];

	lines.push('');
	lines.push(`${c.cyan}══════════════════════════════════════════════════════════════════════════════${c.r}`);
	lines.push('');

	for (let i = 0; i < art.length; i++) {
		const artLine = `${c.blue}${art[i]}${c.r}`;
		const infoIdx = i - infoStart;
		if (infoIdx >= 0 && infoIdx < info.length) {
			const [label, value] = info[infoIdx];
			const padded = label.padStart(maxLabel);
			lines.push(`${artLine}  ${c.cyan}${padded}${c.r} ${c.dim}│${c.r} ${c.white}${value}${c.r}`);
		} else {
			lines.push(artLine);
		}
	}

	lines.push('');
	lines.push(`${c.bBlue}  _____          _   _ ______   _____  _____ ${c.r}`);
	lines.push(`${c.bBlue} |  __ \\   /\\   | \\ | |  ____| / ____|/ ____|${c.r}`);
	lines.push(`${c.bBlue} | |  | | /  \\  |  \\| | |__   | |  __| |  __ ${c.r}`);
	lines.push(`${c.bBlue} | |  | |/ /\\ \\ | . \` |  __|  | | |_ | | |_ |${c.r}`);
	lines.push(`${c.bBlue} | |__| / ____ \\| |\\  | |____ | |__| | |__| |${c.r}`);
	lines.push(`${c.bBlue} |_____/_/    \\_\\_| \\_|______(_)_____|\\______|${c.r}`);
	lines.push('');
	lines.push(`${c.cyan}══════════════════════════════════════════════════════════════════════════════${c.r}`);
	lines.push('');

	return lines.join('\n');
}

server.listen(port, host, () => {
	console.log(buildBanner('Frontend', port, host, backend));
	logger.success(`Frontend listening on http://${host}:${port} (proxy → ${backend})`);
});
