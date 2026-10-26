import { app, BrowserWindow, dialog, ipcMain, Menu, powerSaveBlocker } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadActivity, saveActivity } from './storage';

const dataDirectory = process.env.LUCKY_DATA_DIR || path.join(app.getPath('userData'), 'activity');
let window: BrowserWindow | null = null;
let writes: Promise<void> = Promise.resolve();
let blocker: number | undefined;
let closing = false;
let drawIsActive = false;
let quitting = false;

app.on('before-quit', () => { quitting = true; });

function createWindow() {
  window = new BrowserWindow({
    width: 1380, height: 900, minWidth: 960, minHeight: 680,
    backgroundColor: '#0b0b0e', title: '幸运时刻',
    autoHideMenuBar: true,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 20, y: 28 } } : {}),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
    show: false,
  });
  window.once('ready-to-show', () => window?.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.on('enter-full-screen', () => window?.webContents.send('fullscreen-change', true));
  window.on('leave-full-screen', () => window?.webContents.send('fullscreen-change', false));
  closing = false;
  window.on('close', async event => {
    if (!window || window.isDestroyed()) return;
    event.preventDefault();
    if (closing) return;
    closing = true;
    if (drawIsActive) {
      const answer = await dialog.showMessageBox(window, {
        type: 'question', title: '抽奖正在进行', message: '现在退出抽奖？',
        detail: '已经保存的中奖记录会保留。尚未揭晓的抽奖可能不会计入记录。',
        buttons: ['继续抽奖', '退出应用'], defaultId: 0, cancelId: 0,
      });
      if (answer.response !== 1) { closing = false; quitting = false; return; }
    }
    window.webContents.send('app:prepare-close');
  });
  if (process.env.LUCKY_DEV_URL && !app.isPackaged) window.loadURL(process.env.LUCKY_DEV_URL);
  else window.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: '幸运时刻', submenu: [{ role: 'about' as const }, { type: 'separator' as const }, { role: 'hide' as const }, { role: 'quit' as const }] }] : []),
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '显示', submenu: [{ role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
  ]));
  ipcMain.handle('activity:load', () => loadActivity(dataDirectory));
  ipcMain.handle('activity:save', (_event, value: unknown) => {
    const current = writes.catch(() => undefined).then(() => saveActivity(dataDirectory, value));
    writes = current;
    return current;
  });
  ipcMain.handle('results:export', async (_event, bytes: unknown) => {
    if (!(bytes instanceof Uint8Array) || bytes.length > 20 * 1024 * 1024) throw new Error('导出数据无效。');
    const result = await dialog.showSaveDialog(window!, {
      title: '导出中奖记录', defaultPath: `中奖记录-${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }],
    });
    if (result.canceled || !result.filePath) return false;
    await writeFile(result.filePath, bytes);
    return true;
  });
  ipcMain.handle('window:fullscreen', () => {
    const next = !window?.isFullScreen();
    window?.setFullScreen(next);
    return next;
  });
  ipcMain.handle('draw:active', (_event, active: unknown) => {
    drawIsActive = active === true;
    if (active === true && blocker === undefined) blocker = powerSaveBlocker.start('prevent-display-sleep');
    if (active === false && blocker !== undefined) { powerSaveBlocker.stop(blocker); blocker = undefined; }
  });
  ipcMain.on('app:ready-to-close', () => {
    if (!closing) return;
    writes.then(() => { window?.destroy(); window = null; if (quitting) app.quit(); }).catch(() => {
      closing = false;
      quitting = false;
      dialog.showErrorBox('保存失败', '无法保存活动，已取消关闭。请检查磁盘空间和写入权限。');
    });
  });
  ipcMain.on('app:close-error', () => {
    closing = false;
    quitting = false;
    dialog.showErrorBox('保存失败', '无法保存活动，已取消关闭。请检查磁盘空间和写入权限。');
  });
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => {
  drawIsActive = false;
  if (blocker !== undefined) { powerSaveBlocker.stop(blocker); blocker = undefined; }
  if (process.platform !== 'darwin') app.quit();
});
