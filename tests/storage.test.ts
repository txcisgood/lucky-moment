import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadActivity, saveActivity } from '../src/desktop/storage';
import { drawRound, newActivity, participantsFromNames } from '../src/core/lottery';

test('原子保存与重启恢复中奖记录、设置、名单', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lucky-test-'));
  try {
    const a = newActivity(); a.participants = participantsFromNames(['张三', '李四', '王五'], true);
    const result = drawRound(a);
    await saveActivity(directory, result);
    const loaded = await loadActivity(directory);
    assert.deepEqual(loaded.activity, result);
    assert.equal(loaded.warning, undefined);
    assert.ok(!(await readdir(directory)).includes('activity.tmp.json'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('主文件损坏时恢复备份并保留异常文件', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lucky-test-'));
  try {
    const a = newActivity(); a.settings.title = '备份活动';
    await saveActivity(directory, a);
    await saveActivity(directory, { ...a, settings: { ...a.settings, title: '新活动' } });
    await writeFile(path.join(directory, 'activity.json'), '{broken');
    const loaded = await loadActivity(directory);
    assert.equal(loaded.activity.settings.title, '备份活动');
    assert.ok(loaded.warning);
    assert.ok((await readdir(directory)).some(name => name.startsWith('activity.recovered-')));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('非法保存不覆盖原文件', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lucky-test-'));
  try {
    await saveActivity(directory, newActivity());
    const text = await readFile(path.join(directory, 'activity.json'), 'utf8');
    await assert.rejects(saveActivity(directory, { version: 7 }));
    assert.equal(await readFile(path.join(directory, 'activity.json'), 'utf8'), text);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
