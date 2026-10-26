import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { newActivity, validateActivity } from '../core/lottery';
import type { Activity } from '../core/lottery';

export async function loadActivity(directory: string): Promise<{ activity: Activity; warning?: string }> {
  const filename = path.join(directory, 'activity.json');
  try {
    const info = await stat(filename);
    if (info.size > 30 * 1024 * 1024) throw new Error('活动文件过大');
    return { activity: validateActivity(JSON.parse(await readFile(filename, 'utf8'))) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { activity: newActivity() };
    try {
      const activity = validateActivity(JSON.parse(await readFile(path.join(directory, 'activity.backup.json'), 'utf8')));
      await copyFile(filename, path.join(directory, `activity.recovered-${Date.now()}.json`));
      return { activity, warning: '上次的保存文件异常，已恢复最近一次备份。请核对中奖记录。' };
    } catch {
      await mkdir(directory, { recursive: true });
      await copyFile(filename, path.join(directory, `activity.damaged-${Date.now()}.json`)).catch(() => undefined);
      return { activity: newActivity(), warning: '无法读取上次的活动，原文件已保留。请重新导入名单。' };
    }
  }
}

export async function saveActivity(directory: string, value: unknown): Promise<void> {
  const activity = validateActivity(value);
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, 'activity.json');
  const temporary = path.join(directory, 'activity.tmp.json');
  await writeFile(temporary, JSON.stringify(activity), { encoding: 'utf8', flush: true });
  try { await copyFile(filename, path.join(directory, 'activity.backup.json')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await rename(temporary, filename);
}
