import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');

// Colors for terminal logs
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log(`${CYAN}======================================================${RESET}`);
console.log(`${GREEN}  Security Certificate & Compliance System (SCIS)    ${RESET}`);
console.log(`${CYAN}======================================================${RESET}`);
console.log(`${YELLOW}Initializing Unified Development Environment...${RESET}\n`);

// Check if backend is already listening on port 8000
function checkBackendRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/api/v1/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

let backendProcess = null;
let viteProcess = null;

function cleanup() {
  console.log(`\n${YELLOW}Shutting down SCIS processes...${RESET}`);
  if (backendProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch {
      // Ignore cleanup error
    }
  }
  if (viteProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', viteProcess.pid, '/f', '/t']);
      } else {
        viteProcess.kill('SIGTERM');
      }
    } catch {
      // Ignore cleanup error
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function start() {
  const isRunning = await checkBackendRunning();

  if (isRunning) {
    console.log(`${GREEN}[Backend] FastAPI server already running on http://127.0.0.1:8000${RESET}`);
  } else {
    console.log(`${CYAN}[Backend] Starting FastAPI Uvicorn server on http://127.0.0.1:8000...${RESET}`);
    
    // Launch backend
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    backendProcess = spawn(
      pythonCmd,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'],
      {
        cwd: backendDir,
        shell: true,
        stdio: 'inherit',
      }
    );

    backendProcess.on('error', (err) => {
      console.error(`${YELLOW}[Backend Error] Failed to start Python backend: ${err.message}${RESET}`);
    });
  }

  // Launch Vite Frontend
  console.log(`${GREEN}[Frontend] Starting Vite Development Server on http://localhost:5173...${RESET}\n`);
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  viteProcess = spawn(npxCmd, ['vite'], {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit',
  });

  viteProcess.on('error', (err) => {
    console.error(`${YELLOW}[Frontend Error] Failed to start Vite: ${err.message}${RESET}`);
  });
}

start();
