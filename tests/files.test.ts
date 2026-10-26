import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createResultsWorkbook, readNamesFile } from '../src/core/files';
import { drawRound, newActivity, participantsFromNames } from '../src/core/lottery';

test('Excel 跳过表头及空行，只读取第一列，保留同名项', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('名单');
  sheet.addRows([['姓名', '部门'], ['张三', '市场'], [], [' 李四 ', '研发'], ['张三', '销售']]);
  const file = new File([new Uint8Array(await workbook.xlsx.writeBuffer())], '名单.xlsx');
  assert.deepEqual(await readNamesFile(file), ['张三', '李四', '张三']);
});
test('TXT 支持 UTF8、UTF16 和混合逗号，CSV 明确拒绝', async () => {
  assert.deepEqual(await readNamesFile(new File(['张三，李四, 王五'], '名单.txt')), ['张三', '李四', '王五']);
  const encoded = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('张三，李四', 'utf16le')]);
  assert.deepEqual(await readNamesFile(new File([encoded], 'utf16.txt')), ['张三', '李四']);
  await assert.rejects(readNamesFile(new File(['a,b'], '名单.csv')), /请选择/);
});
test('导出 Excel 包含中奖人、轮次、时间，姓名按字符串而非公式存储', async () => {
  const a = newActivity(); a.participants = participantsFromNames(['=SUM(1,2)'], false);
  const result = drawRound(a);
  const bytes = await createResultsWorkbook(result);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.rowCount, 2); assert.equal(sheet.getCell('C2').value, '=SUM(1,2)');
  assert.equal(sheet.getCell('C2').type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell('B2').value, '幸运之选');
});
