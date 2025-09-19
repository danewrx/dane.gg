import { handler } from './frontend/build/handler.js';
import express from 'express';
import { createDefaultAdmin } from './backend/src/utils/createDefaultAdmin';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

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

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler for API routes (before SvelteKit)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Let SvelteKit handle everything else
app.use(handler);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  // ANSI Color codes
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    lightBlue: '\x1b[94m',
    lightCyan: '\x1b[96m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m'
  };

  console.log('\n');
  console.log(`${colors.cyan}══════════════════════════════════════════════${colors.reset}`);
  console.log('');
  console.log(`${colors.dim}${colors.blue}        ⠀⠀⠀⠀⢀⡠⠤⠔⢲⢶⡖⠒⠤⢄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠀⠀⣠⡚⠁⢀⠀⠀⢄⢻⣿⠀⠀⠀⡙⣷⢤⡀⠀⠀⠀⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠀⡜⢱⣇⠀⣧⢣⡀⠀⡀⢻⡇⠀⡄⢰⣿⣷⡌⣢⡀⠀⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠸⡇⡎⡿⣆⠹⣷⡹⣄⠙⣽⣿⢸⣧⣼⣿⣿⣿⣶⣼⣆⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⣷⡇⣷⡇⢹⢳⡽⣿⡽⣷⡜⣿⣾⢸⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⣿⡇⡿⣿⠀⠣⠹⣾⣿⣮⠿⣞⣿⢸⣿⣛⢿⣿⡟⠯⠉⠙⠛⠓${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⣿⣇⣷⠙⡇⠀⠁⠀⠉⣽⣷⣾⢿⢸⣿⠀⢸⣿⢿⠀⠀⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⡟⢿⣿⣷⣾⣆⠀⠀⠘⠘⠿⠛⢸⣼⣿⢖⣼⣿⠘⡆⠀⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠃⢸⣿⣿⡘⠋⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⡆⠇⠀⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠀⢸⡿⣿⣇⠀⠈⠀⠤⠀⠀⢀⣿⣿⣿⣿⣿⣿⣧⢸⠀⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠀⠈⡇⣿⣿⣷⣤⣀⠀⣀⠔⠋⣿⣿⣿⣿⣿⡟⣿⡞⡄⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠀⠀⢿⢸⣿⣿⣿⣿⣿⡇⠀⢠⣿⡏⢿⣿⣿⡇⢸⣇⠇⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠀⠀⢸⡏⣿⣿⣿⠟⠋⣀⠠⣾⣿⠡⠀⢉⢟⠷⢼⣿⣿⠀⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠀⠀⠈⣷⡏⡱⠁⠀⠊⠀⠀⣿⣏⣀⡠⢣⠃⠀⠀⢹⣿⡄⠀⠀${colors.reset}`);
  console.log(`${colors.dim}${colors.blue}        ⠀⠀⠘⢼⣿⠀⢠⣤⣀⠉⣹⡿⠀⠁⠀⡸⠀⠀⠀⠈⣿⡇⠀⠀${colors.reset}`);
  console.log('');
  console.log(`${colors.bright}${colors.lightBlue} ·▄▄▄▄   ▄▄▄·  ▐ ▄ ▄▄▄ .    ▄▄ •  ▄▄ •  ${colors.reset}`);
  console.log(`${colors.bright}${colors.lightBlue} ██▪ ██ ▐█ ▀█ •█▌▐█▀▄.▀·   ▐█ ▀ ▪▐█ ▀ ▪ ${colors.reset}`);
  console.log(`${colors.bright}${colors.lightBlue} ▐█· ▐█▌▄█▀▀█ ▐█▐▐▌▐▀▀▪▄   ▄█ ▀█▄▄█ ▀█▄ ${colors.reset}`);
  console.log(`${colors.bright}${colors.lightBlue} ██. ██ ▐█ ▪▐▌██▐█▌▐█▄▄▌   ▐█▄▪▐█▐█▄▪▐█ ${colors.reset}`);
  console.log(`${colors.bright}${colors.lightBlue} ▀▀▀▀▀•  ▀  ▀ ▀▀ █▪ ▀▀▀  ▀ ·▀▀▀▀ ·▀▀▀▀  ${colors.reset}`);
  console.log('');
  console.log(`${colors.cyan}══════════════════════════════════════════════${colors.reset}`);
  console.log('');
  console.log(`${colors.green}🚀${colors.reset} ${colors.bright}Server running on port ${colors.yellow}${PORT}${colors.reset}`);
  console.log(`${colors.blue}🖥️${colors.reset} ${colors.bright}Frontend:${colors.reset} ${colors.green}http://localhost:${PORT}${colors.reset}`);
  console.log(`${colors.magenta}🌐${colors.reset} ${colors.bright}API:${colors.reset} ${colors.red}http://localhost:${PORT}/api${colors.reset}`);
  console.log(`${colors.green}🔌${colors.reset} ${colors.bright}API Health:${colors.reset} ${colors.yellow}http://localhost:${PORT}/api/health${colors.reset}`);
  console.log('');
  console.log(`${colors.cyan}══════════════════════════════════════════════${colors.reset}`);
  console.log('');
  console.log(`${colors.bright}${colors.lightBlue}All services are running! (⌒▽⌒)☆${colors.reset}`);
  
  // Initialize default admin after server starts
  createDefaultAdmin().catch(error => {
    console.error('❌ Failed to initialize default admin:', error);
  });
});