import { logger } from './utils/logger';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import os from 'node:os';
import path from 'node:path';
import { createDefaultAdmin } from './utils/createDefaultAdmin';

const app = express();

app.set('trust proxy', 1);

const server = createServer(app);
const backendPort = process.env.BACKEND_PORT || process.env.PORT || '3001';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(process.cwd(), 'static', 'uploads')));
app.use('/chat-sounds', express.static(path.join(process.cwd(), 'static', 'chat-sounds')));

// Session configuration. Sessions persist in Postgres so admin logins
// survive backend restarts/redeploys; without DATABASE_URL (e.g. some test
// contexts) express-session falls back to its in-memory store.
const PgSessionStore = connectPgSimple(session);
const sessionStore = process.env.DATABASE_URL
	? new PgSessionStore({
			conString: process.env.DATABASE_URL,
			tableName: 'session',
			createTableIfMissing: true
		})
	: undefined;

app.use(
	session({
		store: sessionStore,
		secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production',
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.COOKIE_SECURE === 'true',
			httpOnly: true,
			maxAge: 24 * 60 * 60 * 1000, // 1 day
			sameSite: 'strict'
		},
		name: 'dane.gg.sid'
	})
);

// CORS middleware (for development)
app.use((req, res, next) => {
	const origin = req.headers.origin;
	const allowedOrigins = [
		'http://localhost:5173', // Vite dev server
		'http://localhost:3000', // SvelteKit dev server
		'http://localhost:4173', // Vite preview
		'http://127.0.0.1:5173',
		'http://127.0.0.1:3000',
		'http://127.0.0.1:4173'
	];
	const publicOrigin = process.env.PUBLIC_ORIGIN || process.env.ORIGIN;
	if (publicOrigin) {
		allowedOrigins.push(publicOrigin);
	}

	if (allowedOrigins.includes(origin || '')) {
		res.header('Access-Control-Allow-Origin', origin);
	}

	res.header('Access-Control-Allow-Credentials', 'true');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie'
	);

	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
	} else {
		next();
	}
});

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import statusRoutes from './routes/status';
import configRoutes from './routes/config';
import settingsRoutes from './routes/settings';
import totpRoutes from './routes/totp';
import widgetsRoutes from './routes/widgets';
import webhooksRoutes from './routes/webhooks';
import socialLinksRoutes from './routes/socialLinks';
import statsRoutes from './routes/stats';
import trackingRoutes from './routes/tracking';
import blogRoutes from './routes/blog';
import uploadRoutes from './routes/upload';
import uptimeKumaRoutes from './routes/uptimeKuma';
import twitterRoutes from './routes/twitter';
import notificationRoutes from './routes/notifications';
import projectsRoutes from './routes/projects';
import chatRoutes from './routes/chat';
import apiKeysRoutes from './routes/apiKeys';
import { generalLimiter } from './middleware/rateLimiting';
import { chatService } from './services/chatService';
import emojisRoutes from './routes/emojis';
import chatNotificationSoundsRoutes from './routes/chatNotificationSounds';
import skillsRoutes from './routes/skills';
import certificationsRoutes from './routes/certifications';
import advertsRoutes from './routes/adverts';
import contactRoutes from './routes/contact';
import themesRoutes from './routes/themes';
import fontsRoutes from './routes/fonts';

// Routes
app.get('/api', (req, res) => {
	res.json({
		message: `Hello from the dane.gg API! ☆ ～('▽^人)`,
		version: '2.0.0',
		endpoints: {
			health: '/api/health',
			auth: '/api/auth',
			users: '/api/users',
			settings: '/api/settings',
			totp: '/api/totp',
			widgets: '/api/widgets',
			webhooks: '/webhooks'
		}
	});
});

app.get('/api/health', (req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptime: process.uptime()
	});
});

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

// Auth routes
app.use('/api/auth', authRoutes);

// User management routes
app.use('/api/users', userRoutes);

// Status and monitoring routes
app.use('/api/status', statusRoutes);

// Site configuration routes
app.use('/api/config', configRoutes);

// Settings routes (admin settings, user preferences)
app.use('/api/settings', settingsRoutes);

// TOTP/2FA routes
app.use('/api/totp', totpRoutes);

// Widgets routes (for fetching widget data)
app.use('/api/widgets', widgetsRoutes);

// Social links routes
app.use('/api/social-links', socialLinksRoutes);

// Stats routes (admin only)
app.use('/api/stats', statsRoutes);

// Tracking routes (frontend page view tracking)
app.use('/api/track', trackingRoutes);

// Blog routes
app.use('/api/blog', blogRoutes);

// Projects routes
app.use('/api/projects', projectsRoutes);

// Upload routes
app.use('/api/upload', uploadRoutes);

// Uptime Kuma routes
app.use('/api/uptime-kuma', uptimeKumaRoutes);

// Twitter API routes
app.use('/api/twitter', twitterRoutes);

// Notifications routes (Ntfy integration)
app.use('/api/notifications', notificationRoutes);

// Chat routes (admin message history)
app.use('/api/chat', chatRoutes);

// API Keys routes (admin only)
app.use('/api/api-keys', apiKeysRoutes);

// Webhooks routes (for external services to update data)
app.use('/webhooks', webhooksRoutes);

app.use('/api/emojis', emojisRoutes);
app.use('/api/chat-notification-sounds', chatNotificationSoundsRoutes);

// Skills routes
app.use('/api/skills', skillsRoutes);

// Certifications routes
app.use('/api/certifications', certificationsRoutes);

// Advertisement routes
app.use('/api/adverts', advertsRoutes);

// Contact page routes
app.use('/api/contact', contactRoutes);

// Themes routes
app.use('/api/themes', themesRoutes);

// Fonts routes
app.use('/api/fonts', fontsRoutes);

// 404 handler for API routes
app.use('/api', (req, res) => {
	res.status(404).json({ error: 'API route not found' });
});

// Error handler
app.use((err: any, req: any, res: any, _next: any) => {
	logger.error(err.stack);
	res.status(500).json({ error: 'Something went wrong!' });
});

// Only show console messages if running standalone
const isStandalone = process.env.NODE_ENV !== 'production';

// Initialize default admin user on startup
async function initializeApp() {
	try {
		const { ensureChatNotificationSoundsDisplayName } =
			await import('./db/ensureChatNotificationSoundsDisplayName');
		await ensureChatNotificationSoundsDisplayName();
	} catch (error) {
		logger.error('Notification sounds schema check failed:', error);
	}

	try {
		const { ensureGoogleFontsIfEmpty } = await import('./db/ensureGoogleFonts');
		await ensureGoogleFontsIfEmpty();
	} catch (error) {
		logger.error('Google fonts bootstrap failed:', error);
	}

	try {
		const { ensureBuiltinSiteFont } = await import('./db/ensureBuiltinSiteFont');
		await ensureBuiltinSiteFont();
	} catch (error) {
		logger.error('Built-in site font bootstrap failed:', error);
	}

	try {
		const { ensureDefaultTheme } = await import('./db/ensureDefaultTheme');
		await ensureDefaultTheme();
	} catch (error) {
		logger.error('Default theme bootstrap failed:', error);
	}

	try {
		await createDefaultAdmin();

		// Initialize Twitter scheduler
		const { TwitterScheduler } = await import('./services/twitterScheduler');
		await TwitterScheduler.initialize();
	} catch (error) {
		logger.error('Failed to initialize app:', error);
	}

	// Initialize chat WebSocket server (don't block on errors)
	try {
		await chatService.initialize(server);
	} catch (error) {
		logger.error('Failed to initialize chat service:', error);
		// Don't throw - allow server to continue even if chat fails
	}
}

const HOST = process.env.HOST || '0.0.0.0';

function buildBanner(service: string, port: string | number, host: string) {
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
	const runtime = typeof Bun !== 'undefined' ? `Bun ${Bun.version}` : `Node ${process.version}`;

	const info: [string, string][] = [
		['Service', `${service}`],
		['Host', `${host}:${port}`],
		['Runtime', runtime],
		['Platform', `${os.platform()} ${os.arch()}`],
		['Hostname', os.hostname()],
		['CPU', `${cpuModel} (${cpus.length} cores)`],
		['Memory', `${freeMem} GB free / ${totalMem} GB total`],
		['PID', `${process.pid}`],
		['Node', process.env.NODE_ENV || 'development']
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
	const lines: string[] = [];

	lines.push(
		'',
		`${c.cyan}══════════════════════════════════════════════════════════════════════════════${c.r}`,
		''
	);

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

	lines.push(
		'',
		`${c.bBlue}  _____          _   _ ______   _____  _____ ${c.r}`,
		String.raw`${c.bBlue} |  __ \   /\   | \ | |  ____| / ____|/ ____|${c.r}`,
		String.raw`${c.bBlue} | |  | | /  \  |  \| | |__   | |  __| |  __ ${c.r}`,
		`${c.bBlue} | |  | |/ /\\ \\ | . \` |  __|  | | |_ | | |_ |${c.r}`,
		String.raw`${c.bBlue} | |__| / ____ \| |\  | |____ | |__| | |__| |${c.r}`,
		String.raw`${c.bBlue} |_____/_/    \_\_| \_|______(_)_____|\______|${c.r}`,
		'',
		`${c.cyan}══════════════════════════════════════════════════════════════════════════════${c.r}`,
		''
	);

	return lines.join('\n');
}

server
	.listen(Number(backendPort), HOST, async () => {
		console.log(buildBanner('Backend API', backendPort, HOST));
		logger.success(`Backend API listening on http://${HOST}:${backendPort}`);
		logger.info(`Health: http://${HOST}:${backendPort}/api/health`);

		try {
			await initializeApp();
		} catch (error) {
			logger.error('Error during app initialization:', error);
		}
	})
	.on('error', (error: any) => {
		logger.error('Failed to start server:', error);
		if (error.code === 'EADDRINUSE') {
			logger.error(
				`Port ${backendPort} is already in use. Please stop the other process or change BACKEND_PORT (or PORT).`
			);
		}
		process.exit(1);
	});
