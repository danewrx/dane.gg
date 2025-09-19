import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// CORS middleware (for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
app.get('/api', (req, res) => {
  res.json({ 
    message: `Hello from the dane.gg API! ☆ ～('▽^人)`,
    version: '2.0.0',
    endpoints: {
      health: '/api/health'
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

if (isStandalone) {
  app.listen(PORT, () => {
    console.log(`🚀 Express API running at http://localhost:${PORT}`);
    console.log(`📚 Health endpoint: http://localhost:${PORT}/api/health`);
  });
} else {
  // If imported, start the server without console output
  app.listen(PORT);
}
