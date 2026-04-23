import http from 'node:http';
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

server.listen(port, host, () => {
	logger.success(`listening on http://${host}:${port} (proxy → ${backend})`);
});
