import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { createDefaultAdmin } from './utils/createDefaultAdmin';

// Load environment variables from root .env file
config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'strict'
  },
  name: 'dane.gg.sid'
}));

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

  if (allowedOrigins.includes(origin || '')) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  
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
import { generalLimiter } from './middleware/rateLimiting';

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

// Upload routes
app.use('/api/upload', uploadRoutes);

// Uptime Kuma routes
app.use('/api/uptime-kuma', uptimeKumaRoutes);

// Twitter API routes
app.use('/api/twitter', twitterRoutes);

// Notifications routes (Ntfy integration)
app.use('/api/notifications', notificationRoutes);

// Webhooks routes (for external services to update data)
app.use('/webhooks', webhooksRoutes);

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Only show console messages if running standalone
const isStandalone = process.env.NODE_ENV !== 'production' && process.argv[1]?.includes('index.ts');

// Initialize default admin user on startup
async function initializeApp() {
  try {
    await createDefaultAdmin();
    
    // Twitter API scheduled task
    if (process.env.TWITTER_COOKIES && process.env.TWITTER_USERNAME) {
      const { TwitterApiService } = await import('./services/twitterApiService');
      const username = process.env.TWITTER_USERNAME;
      
      const connectionTest = await TwitterApiService.testConnection(username);
      if (connectionTest.connected) {
        console.log(`[Twitter API] ✅ Connection test successful`);
      } else {
        console.error(`[Twitter API] ❌ Connection test failed: ${connectionTest.message}`);
      }
      
      TwitterApiService.fetchAndUpdateLatestTweet(username).catch(err => {
        console.error('[Twitter API] Initial fetch failed:', err.message);
      });
      
      // Fetch at configured interval
      // WARNING: Too frequent polling can trigger Twitter rate limits or account restrictions
      // Minimum: 30 seconds
      const pollInterval = Math.max(
        parseInt(process.env.TWITTER_POLL_INTERVAL || '120000', 10), // Default 2 minutes
        30000
      );
      
      setInterval(() => {
        TwitterApiService.fetchAndUpdateLatestTweet(username).catch(err => {
          console.error('[Twitter API] Scheduled fetch failed:', err.message);
        });
      }, pollInterval);
      
      // Health check
      const healthCheckInterval = 2 * 60 * 60 * 1000; // 2 hours
      setInterval(() => {
        TwitterApiService.checkConnectionHealth(username).catch(err => {
          console.error('[Twitter API] Health check failed:', err.message);
        });
      }, healthCheckInterval);
      
      const intervalMinutes = pollInterval / 60000;
      const healthCheckHours = healthCheckInterval / (60 * 60 * 1000);
      console.log(`[Twitter API] Scheduled task initialized for @${username} (every ${intervalMinutes} minutes)`);
      console.log(`[Twitter API] Health checks enabled (every ${healthCheckHours} hours)`);
      console.log(`[Twitter API] ⚠️  WARNING: Polling too frequently may trigger Twitter rate limits or account restrictions`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize default admin:', error);
  }
}

if (isStandalone) {
  app.listen(PORT, async () => {
    console.log(`🚀 Express API running at http://localhost:${PORT}`);
    console.log(`📚 Health endpoint: http://localhost:${PORT}/api/health`);
    
    // Initialize default admin after server starts
    await initializeApp();
  });
} else {
  // If imported, start the server without console output
  app.listen(PORT, async () => {
    // Still initialize admin even when imported
    await initializeApp();
  });
}
