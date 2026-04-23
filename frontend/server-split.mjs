import http from 'node:http';
import { handler } from './build/handler.js';
import httpProxy from 'http-proxy';

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
	console.error('[proxy]', err.message);
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
	console.log(`[frontend] listening on http://${host}:${port} (proxy → ${backend})`);
});
