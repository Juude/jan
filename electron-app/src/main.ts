import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;
let sidecarProcess: ChildProcess | null = null;
let serverPort: number | null = null;

// Register asset protocol to serve local files
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { bypassCSP: true, corsEnabled: true, supportFetchAPI: true } }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Keep enabled, we use custom protocol
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3001'
    : `file://${path.join(__dirname, '../dist-web/index.html')}`;

  console.log(`Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startSidecar() {
  // TODO: Adjust path to the actual binary
  const binaryPath = isDev
    ? path.join(__dirname, '../../src-tauri/target/debug/jan-app') // Adjust extension for Windows
    : path.join(process.resourcesPath, 'bin', 'jan-app');

  console.log(`Starting sidecar: ${binaryPath}`);

  sidecarProcess = spawn(binaryPath, ['--electron'], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  sidecarProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    console.log(`[Sidecar]: ${output}`);

    // Look for the port in the output
    const match = output.match(/JAN_SERVER_PORT=(\d+)/);
    if (match) {
      serverPort = parseInt(match[1], 10);
      console.log(`Sidecar server running on port: ${serverPort}`);
      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send('server-port', serverPort);
      }
    }
  });

  sidecarProcess.on('close', (code) => {
    console.log(`Sidecar process exited with code ${code}`);
    sidecarProcess = null;
  });

  sidecarProcess.on('error', (err) => {
    console.error('Failed to start sidecar:', err);
  });
}

app.on('ready', () => {
  protocol.handle('asset', (req) => {
    try {
        const url = new URL(req.url);
        let pathname = decodeURIComponent(url.pathname);

        // Handle Windows paths (e.g., /C:/Users -> C:/Users)
        if (process.platform === 'win32' && pathname.startsWith('/')) {
            pathname = pathname.slice(1);
        }

        // Return response from file
        return net.fetch('file://' + pathname);
    } catch (error) {
        console.error('Failed to handle asset request:', error);
        return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();
  startSidecar();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (sidecarProcess) {
    sidecarProcess.kill();
  }
});

// IPC handlers for UI commands
ipcMain.handle('get-server-port', () => {
    return serverPort;
});

ipcMain.handle('open_dialog', async (event, args) => {
    if (!mainWindow) return null;
    const { title, defaultPath, filters, multiple, directory } = args || {};
    const properties: any[] = [];
    if (multiple) properties.push('multiSelections');
    if (directory) properties.push('openDirectory');
    else properties.push('openFile');

    const result = await dialog.showOpenDialog(mainWindow, {
        title,
        defaultPath,
        filters,
        properties
    });
    return result.canceled ? null : (multiple ? result.filePaths : result.filePaths[0]);
});

ipcMain.handle('save_dialog', async (event, args) => {
    if (!mainWindow) return null;
    const { title, defaultPath, filters } = args || {};
    const result = await dialog.showSaveDialog(mainWindow, {
        title,
        defaultPath,
        filters
    });
    return result.canceled ? null : result.filePath;
});
