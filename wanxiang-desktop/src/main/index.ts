import { app, BrowserWindow, ipcMain } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DSH_VERSION = '0.1.1-rc.2';
const PROJECT_FILE = 'project.json';

type ProjectState = {
  name: string;
  stage: number;
  brief: string;
  dataConnected: boolean;
  agentBuilt: boolean;
  evaluationPassed: boolean;
  shadowRuns: number;
  published: boolean;
  updatedAt: string;
};

const defaultProject: ProjectState = {
  name: '客户跟进简报',
  stage: 0,
  brief:
    '每周一从客户表找出 14 天没有跟进、但有明确采购意向的客户，并为每位销售整理优先跟进清单。',
  dataConnected: false,
  agentBuilt: false,
  evaluationPassed: false,
  shadowRuns: 0,
  published: false,
  updatedAt: new Date(0).toISOString(),
};

function workspaceRoot() {
  return join(app.getPath('userData'), 'workspace');
}

function projectPath() {
  return join(workspaceRoot(), PROJECT_FILE);
}

async function ensureWorkspace() {
  await mkdir(workspaceRoot(), { recursive: true });
}

async function readProject(): Promise<ProjectState> {
  await ensureWorkspace();
  try {
    const raw = await readFile(projectPath(), 'utf8');
    return { ...defaultProject, ...JSON.parse(raw) } as ProjectState;
  } catch {
    await writeFile(projectPath(), JSON.stringify(defaultProject, null, 2));
    return defaultProject;
  }
}

async function saveProject(project: ProjectState) {
  await ensureWorkspace();
  const next = { ...project, updatedAt: new Date().toISOString() };
  await writeFile(projectPath(), JSON.stringify(next, null, 2));
  return next;
}

function registerIpc() {
  ipcMain.handle('workspace:read-project', () => readProject());
  ipcMain.handle('workspace:save-project', (_event, project: ProjectState) =>
    saveProject(project),
  );
  ipcMain.handle('system:status', () => ({
    localOnly: true,
    workspaceRoot: workspaceRoot(),
    dsh: {
      version: DSH_VERSION,
      bundled: true,
      runtimeConnected: false,
    },
  }));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1060,
    minHeight: 700,
    title: '万象',
    backgroundColor: '#f4f1ea',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.setMenuBarVisibility(false);

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
