import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import ExcelJS from 'exceljs';

async function pasteNames(page: Page, names = '张三,李四，王五，赵六') {
  await page.getByRole('button', { name: '导入名单', exact: true }).first().click();
  await page.getByRole('tab', { name: '粘贴名单' }).click();
  await page.getByLabel('参与者姓名').fill(names);
  await page.getByRole('button', { name: /^导入 \d+ 人$/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '抽奖设置', exact: true }).click();
}
async function nextRound(page: Page) { await page.getByRole('button', { name: '继续下一轮' }).click(); await page.getByRole('button', { name: '抽奖设置', exact: true }).click(); }

test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.getByText('活动已自动保存')).toBeVisible(); });

test('动画设置持久化，逐个展示前保存完整中奖记录，刷新后恢复全部', async ({ page }) => {
  await pasteNames(page, Array.from({ length: 30 }, (_, i) => `示例候选${i + 1}`).join('，'));
  await page.getByLabel('中奖人数', { exact: true }).fill('20');
  await page.getByRole('tab', { name: '动效与揭晓', exact: true }).click();
  await page.getByLabel('动画速度', { exact: true }).press('End');
  await page.getByRole('button', { name: '逐个揭晓', exact: true }).click();
  await page.getByRole('button', { name: '开始抽奖', exact: true }).click();
  await expect(page.locator('.name-universe')).toHaveAttribute('data-speed', '2');
  await page.getByRole('button', { name: '停止，揭晓幸运', exact: true }).click();
  await expect(page.getByRole('button', { name: '显示全部中奖者', exact: true })).toBeVisible();
  expect(await page.locator('.winner-name').count()).toBeLessThan(20);
  await expect(page.getByRole('button', { name: '继续下一轮', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.locator('.winner-name')).toHaveCount(20);
  await expect(page.getByRole('button', { name: '继续下一轮', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '抽奖设置', exact: true }).click();
  await page.getByRole('tab', { name: '动效与揭晓', exact: true }).click();
  await expect(page.getByLabel('动画速度', { exact: true })).toHaveValue('2');
  await expect(page.getByRole('button', { name: '逐个揭晓', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('空状态、混合逗号导入、手动抽奖、历史、导出和重启恢复', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await expect(page.getByRole('button', { name: '开始抽奖' })).toBeDisabled();
  await pasteNames(page);
  await page.getByLabel('中奖人数', { exact: true }).fill('2');
  await page.getByRole('button', { name: '开始抽奖' }).click();
  await expect(page.getByLabel('本轮名称')).toBeDisabled();
  await page.getByRole('button', { name: '停止，揭晓幸运' }).click();
  await expect(page.getByLabel('本轮中奖结果').locator('.winner')).toHaveCount(2);
  const winners = await page.locator('.winner-name').allTextContents();
  expect(new Set(winners).size).toBe(2);
  await page.screenshot({ path: 'test-results/winners.png' });
  await page.getByRole('button', { name: /中奖记录/ }).click();
  await expect(page.getByRole('dialog').getByText('1 轮抽奖，共产生 2 个中奖名额')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 Excel' }).click();
  expect((await download).suggestedFilename()).toMatch(/中奖记录.*\.xlsx/);
  await page.getByLabel('关闭弹窗').click();
  await page.reload();
  await expect(page.getByLabel('本轮中奖结果').locator('.winner')).toHaveCount(2);
  await nextRound(page);
  await page.getByRole('button', { name: '开始抽奖' }).click();
  await page.getByRole('button', { name: '停止，揭晓幸运' }).click();
  await expect(page.getByLabel('本轮中奖结果').locator('.winner')).toHaveCount(2);
  const nextWinners = await page.locator('.winner-name').allTextContents();
  expect(nextWinners.every(name => !winners.includes(name))).toBe(true);
  expect(errors).toEqual([]);
});

test('定时停止、重复中奖切换、抽完状态和重置活动', async ({ page }) => {
  await pasteNames(page, '甲，乙');
  await page.getByLabel('中奖人数', { exact: true }).fill('2');
  await page.getByRole('button', { name: '定时停止', exact: true }).click();
  await page.getByLabel('滚动时长').fill('1');
  await page.getByRole('button', { name: '开始抽奖' }).click();
  await expect(page.getByRole('button', { name: '继续下一轮' })).toBeVisible();
  await nextRound(page);
  await expect(page.getByRole('button', { name: '开始抽奖' })).toBeDisabled();
  await page.getByRole('switch', { name: '允许重复中奖' }).click();
  await expect(page.getByRole('button', { name: '开始抽奖' })).toBeEnabled();
  await page.getByRole('button', { name: '开始抽奖' }).click();
  await expect(page.getByRole('button', { name: '继续下一轮' })).toBeVisible();
  await nextRound(page);
  await page.getByRole('switch', { name: '允许重复中奖' }).click();
  await expect(page.getByRole('button', { name: '开始抽奖' })).toBeDisabled();
  await page.getByRole('button', { name: '重新开始活动', exact: true }).click();
  await page.getByRole('button', { name: '确认重新开始' }).click();
  await expect(page.getByRole('button', { name: '开始抽奖' })).toBeEnabled();
});

test('Excel/TXT 文件与重复姓名提示，CSV 被拒绝', async ({ page }) => {
  await page.getByRole('button', { name: '导入名单', exact: true }).first().click();
  await page.getByLabel('选择名单文件').setInputFiles({ name: '名单.csv', mimeType: 'text/csv', buffer: Buffer.from('张三,李四') });
  await expect(page.getByRole('alert')).toContainText('请选择');
  await page.getByLabel('选择名单文件').setInputFiles({ name: '名单.txt', mimeType: 'text/plain', buffer: Buffer.from('张三，李四,张三') });
  await expect(page.getByText('发现 1 个重复姓名')).toBeVisible();
  await page.getByLabel('全部保留，每条记录算一位参与者').check();
  await page.getByRole('button', { name: '导入 3 人', exact: true }).click();
  await page.getByRole('button', { name: '导入名单', exact: true }).first().click();
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('名单'); sheet.addRows([['姓名'], ['陈一'], ['陈二']]);
  await page.getByLabel('选择名单文件').setInputFiles({ name: '新名单.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
  await expect(page.getByRole('button', { name: '替换名单并重新开始' })).toBeDisabled();
  await page.getByLabel('我确认替换当前名单，并清空本场中奖记录。').check();
  await page.getByRole('button', { name: '替换名单并重新开始' }).click();
  await page.getByRole('button', { name: '名单管理', exact: true }).click();
  await expect(page.getByText('陈一', { exact: true })).toBeVisible();
  await page.getByLabel('移除 陈一').click();
  await page.getByRole('button', { name: '保存名单' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('1 万人导入、键盘操作与小窗口排版', async ({ page }) => {
  await pasteNames(page, Array.from({ length: 10000 }, (_, i) => `参与者${i + 1}`).join('，'));
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Space');
  await expect(page.getByLabel('姓名滚动中')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: '继续下一轮' })).toBeVisible();
  await page.setViewportSize({ width: 960, height: 680 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const controls = await page.getByRole('button', { name: '继续下一轮' }).boundingBox();
  expect(controls && controls.y + controls.height).toBeLessThan(680);
  await page.screenshot({ path: 'test-results/small-window.png', fullPage: true });
});

test('舞台初始视觉与移动预览没有横向溢出', async ({ page }) => {
  await page.screenshot({ path: 'test-results/initial.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
