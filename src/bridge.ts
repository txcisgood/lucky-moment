import { newActivity, validateActivity } from './core/lottery';
import type { Activity } from './core/lottery';

type DesktopAPI = {
  platform: string;
  load(): Promise<{ activity: Activity; warning?: string }>;
  save(activity: Activity): Promise<void>;
  export(bytes: Uint8Array): Promise<boolean>;
  toggleFullscreen(): Promise<boolean>;
  setDrawActive(active: boolean): Promise<void>;
  onFullscreen(callback: (fullscreen: boolean) => void): () => void;
  onPrepareClose(callback: () => Promise<void>): () => void;
};
declare global { interface Window { lucky?: DesktopAPI } }

const STORAGE_KEY = 'lucky-moment.activity.v1';
const browserAPI: DesktopAPI = {
  platform: 'browser',
  async load() {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return { activity: newActivity() };
    try { return { activity: validateActivity(JSON.parse(text)) }; }
    catch { return { activity: newActivity(), warning: '本地活动数据异常，请重新导入名单。' }; }
  },
  async save(activity) { localStorage.setItem(STORAGE_KEY, JSON.stringify(validateActivity(activity))); },
  async export(bytes) {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `中奖记录-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  },
  async toggleFullscreen() {
    if (document.fullscreenElement) { await document.exitFullscreen(); return false; }
    await document.documentElement.requestFullscreen(); return true;
  },
  async setDrawActive() {},
  onFullscreen(callback) {
    const handler = () => callback(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  },
  onPrepareClose() { return () => undefined; },
};

export const api = window.lucky ?? browserAPI;
let writeQueue = Promise.resolve();
export function persist(activity: Activity): Promise<void> {
  const snapshot = structuredClone(activity);
  const result = writeQueue.catch(() => undefined).then(() => api.save(snapshot));
  writeQueue = result;
  return result;
}
