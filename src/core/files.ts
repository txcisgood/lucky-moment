import { parseNames, validateNames } from './lottery';
import type { Activity } from './lottery';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function readNamesFile(file: File): Promise<string[]> {
  if (file.size > MAX_FILE_BYTES) throw new Error('文件不能超过 20 MB。');
  const extension = file.name.toLowerCase().split('.').pop();
  const buffer = await file.arrayBuffer();
  if (extension === 'txt') {
    const bytes = new Uint8Array(buffer);
    let text: string;
    if (bytes[0] === 0xff && bytes[1] === 0xfe) text = new TextDecoder('utf-16le').decode(buffer);
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) text = new TextDecoder('utf-16be').decode(buffer);
    else {
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
      catch { text = new TextDecoder('gb18030').decode(buffer); }
    }
    return parseNames(text);
  }
  if (extension !== 'xlsx') throw new Error('请选择 Excel（.xlsx）或 TXT 文件。');
  try {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Excel 中没有工作表。');
    const names: string[] = [];
    let isFirst = true;
    sheet.eachRow(row => {
      const cell = row.getCell(1);
      const name = cell.text.trim();
      if (!name) return;
      // Formula results and other columns are intentionally not used as names.
      if (cell.type === ExcelJS.ValueType.Formula) throw new Error('姓名列包含公式，请先粘贴为纯文本。');
      if (isFirst && /^(姓名|名字|name)$/iu.test(name)) { isFirst = false; return; }
      isFirst = false;
      names.push(name);
      if (names.length > 10000) throw new Error('每场活动最多支持 10,000 人。');
    });
    return validateNames(names);
  } catch (error) {
    if (error instanceof Error && /姓名|10,000|工作表|公式|空|字符/.test(error.message)) throw error;
    throw new Error('无法读取 Excel，请确认文件为有效的 .xlsx 格式，且第一列是姓名。');
  }
}

export async function createResultsWorkbook(activity: Activity): Promise<Uint8Array> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '幸运时刻';
  const sheet = workbook.addWorksheet('中奖记录');
  sheet.columns = [
    { header: '轮次', key: 'round', width: 10 }, { header: '奖项', key: 'title', width: 24 },
    { header: '姓名', key: 'name', width: 22 }, { header: '参与编号', key: 'id', width: 40 },
    { header: '抽奖时间', key: 'time', width: 26 }, { header: '允许重复中奖', key: 'repeat', width: 20 },
  ];
  for (const round of activity.rounds) for (const winner of round.winners) {
    sheet.addRow({ round: round.index, title: round.title, name: winner.name, id: winner.id,
      time: new Date(round.drawnAt).toLocaleString('zh-CN', { hour12: false }), repeat: round.allowRepeat ? '是' : '否' });
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB82D3E' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:F1';
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
