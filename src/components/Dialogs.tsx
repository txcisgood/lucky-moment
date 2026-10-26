import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode, DragEvent } from 'react';
import { Check, ChevronRight, Download, FileSpreadsheet, FileText, Search, Trash2, Upload, Users, X } from 'lucide-react';
import { duplicateNames, parseNames, participantsFromNames } from '../core/lottery';
import type { Activity, Participant } from '../core/lottery';
import { createResultsWorkbook, readNamesFile } from '../core/files';
import { api } from '../bridge';

export function Modal({ title, subtitle, children, onClose, wide = false, busy = false }: {
  title: string; subtitle?: string; children: ReactNode; onClose(): void; wide?: boolean; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (event.target === ref.current && !busy) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="modal-header"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <button className="icon-button" aria-label="关闭弹窗" disabled={busy} onClick={onClose}><X size={20} /></button>
    </div>{children}
  </dialog>;
}

export const EXAMPLE_NAMES = '林予安，陈星野，王可欣，李沐阳，赵一诺，周知夏，吴子墨，郑思远，孙悦宁，徐景行，何清越，高以南，沈亦辰，许嘉禾，唐书瑶，陆予白，宋语桐，苏望舒，程嘉言，叶初晴，江明朗，顾安然，夏之恒，方若宁';

export function ImportDialog({ existing, example, onImport, onClose }: {
  existing: boolean; example: boolean; onImport(people: Participant[]): Promise<void>; onClose(): void;
}) {
  const [tab, setTab] = useState<'file' | 'paste'>(example ? 'paste' : 'file');
  const [text, setText] = useState(example ? EXAMPLE_NAMES : '');
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deduplicate, setDeduplicate] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => {
    if (tab === 'file') return { names: fileNames, error: '' };
    if (!text.trim()) return { names: [], error: '' };
    try { return { names: parseNames(text), error: '' }; }
    catch (e) { return { names: [], error: (e as Error).message }; }
  }, [tab, text, fileNames]);
  const duplicates = useMemo(() => duplicateNames(parsed.names), [parsed.names]);
  const count = deduplicate ? new Set(parsed.names).size : parsed.names.length;

  async function readFile(file?: File) {
    if (!file) return;
    setBusy(true); setError(''); setFileNames([]); setFilename('');
    try { const names = await readNamesFile(file); setFileNames(names); setFilename(file.name); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  async function submit() {
    if (!parsed.names.length) return;
    setBusy(true); setError('');
    try { await onImport(participantsFromNames(parsed.names, deduplicate)); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  }
  function drop(event: DragEvent) { event.preventDefault(); setDragging(false); if (!busy) void readFile(event.dataTransfer.files[0]); }

  return <Modal title="导入参与名单" subtitle="把名字交给我们，把期待留给现场。" onClose={onClose} busy={busy}>
    <div className="modal-body">
      <div className="segmented import-tabs" role="tablist" aria-label="导入方式">
        <button role="tab" aria-selected={tab === 'file'} className={tab === 'file' ? 'selected' : ''} disabled={busy} onClick={() => { setTab('file'); setError(''); }}><Upload size={16} />导入文件</button>
        <button role="tab" aria-selected={tab === 'paste'} className={tab === 'paste' ? 'selected' : ''} disabled={busy} onClick={() => { setTab('paste'); setError(''); }}><FileText size={16} />粘贴名单</button>
      </div>
      {tab === 'file' ? <>
        <input ref={input} type="file" accept=".xlsx,.txt" className="visually-hidden" aria-label="选择名单文件" onChange={e => void readFile(e.target.files?.[0])} />
        <button className={`dropzone ${dragging ? 'dragging' : ''}`} disabled={busy} onClick={() => input.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
          <span className="upload-mark">{filename ? <FileSpreadsheet size={28} /> : <Upload size={28} />}</span>
          <strong>{busy ? '正在读取名单…' : filename || '点击选择，或将文件拖到这里'}</strong>
          <span>{filename ? `已识别 ${fileNames.length.toLocaleString()} 个姓名，点击可重新选择` : 'Excel .xlsx / TXT，最大 20 MB'}</span>
        </button>
        <p className="field-note">Excel 读取第一张工作表的第一列，可包含“姓名”表头。TXT 使用中文或英文逗号分隔。</p>
      </> : <>
        <label className="field-label" htmlFor="names-text">参与者姓名</label>
        <textarea id="names-text" value={text} onChange={e => { setText(e.target.value); setError(''); }} placeholder="张三，李四，王五" rows={5} maxLength={1100000} spellCheck={false} />
        <p className="field-note">用中文逗号“，”或英文逗号“,”分隔，支持混用。</p>
      </>}
      {(error || parsed.error) && <p className="inline-error" role="alert">{error || parsed.error}</p>}
      {parsed.names.length > 0 && <div className="import-preview">
        <div className="section-heading"><span>名单预览</span><span className="muted">共 {count.toLocaleString()} 人</span></div>
        <div className="name-chips">{parsed.names.slice(0, 12).map((name, i) => <span key={i}>{name}</span>)}{parsed.names.length > 12 && <span className="muted">+{parsed.names.length - 12}</span>}</div>
      </div>}
      {duplicates.length > 0 && <div className="duplicate-notice"><strong>发现 {duplicates.length} 个重复姓名</strong>
        <p>{duplicates.slice(0, 5).join('、')}{duplicates.length > 5 ? '等' : ''}。同名不同人可选择保留。</p>
        <label><input type="radio" name="duplicates" checked={deduplicate} onChange={() => setDeduplicate(true)} />合并重复姓名</label>
        <label><input type="radio" name="duplicates" checked={!deduplicate} onChange={() => setDeduplicate(false)} />全部保留，每条记录算一位参与者</label>
      </div>}
      {existing && <label className="replace-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />我确认替换当前名单，并清空本场中奖记录。</label>}
    </div>
    <div className="modal-footer"><span className="muted footer-note"><Users size={15} />最多支持 10,000 人</span>
      <button className="button primary" disabled={busy || !count || (existing && !confirmed)} onClick={() => void submit()}>{busy ? '正在处理…' : existing ? '替换名单并重新开始' : `导入${count ? ` ${count} 人` : '名单'}`}<ChevronRight size={16} /></button>
    </div>
  </Modal>;
}

export function RosterDialog({ activity, onSave, onClose }: {
  activity: Activity; onSave(people: Participant[]): Promise<void>; onClose(): void;
}) {
  const [people, setPeople] = useState(activity.participants);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const won = useMemo(() => new Set(activity.rounds.flatMap(r => r.winners.map(p => p.id))), [activity.rounds]);
  const filtered = useMemo(() => people.filter(p => p.name.includes(query.trim())), [people, query]);
  async function save() { setBusy(true); try { await onSave(people); } catch (e) { setError((e as Error).message); setBusy(false); } }
  return <Modal title="参与名单" subtitle={`共 ${people.length.toLocaleString()} 人 · 删除只影响后续抽奖，历史记录会保留`} onClose={onClose} busy={busy}>
    <div className="modal-body">
      <div className="search-input"><Search size={17} /><input aria-label="搜索参与者" placeholder="搜索姓名" value={query} onChange={e => { setQuery(e.target.value); setLimit(100); }} /></div>
      <div className="roster-list">{filtered.slice(0, limit).map(p => <div className="roster-row" key={p.id}>
        <span className="person-avatar">{p.name.slice(0, 1)}</span><span className="person-name">{p.name}</span>{won.has(p.id) && <span className="small-badge">已中奖</span>}
        <button className="icon-button delete-button" aria-label={`移除 ${p.name}`} disabled={busy} onClick={() => setPeople(current => current.filter(x => x.id !== p.id))}><Trash2 size={16} /></button>
      </div>)}{filtered.length === 0 && <div className="empty-small">{people.length ? '没有找到这个名字' : '名单已清空，保存后可重新导入'}</div>}
      {filtered.length > limit && <button className="text-button load-more" onClick={() => setLimit(limit + 100)}>再显示 100 人（剩余 {filtered.length - limit} 人）</button>}</div>
      {error && <p className="inline-error" role="alert">{error}</p>}
    </div>
    <div className="modal-footer"><button className="text-button danger-text" disabled={busy || !people.length} onClick={() => setPeople([])}>清空名单</button><div className="button-row"><button className="button secondary" disabled={busy} onClick={onClose}>取消</button><button className="button primary" disabled={busy} onClick={() => void save()}><Check size={16} />保存名单</button></div></div>
  </Modal>;
}

export function HistoryDialog({ activity, onClose }: { activity: Activity; onClose(): void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [exported, setExported] = useState(false);
  async function exportResults() {
    setBusy(true); setError(''); setExported(false);
    try { if (await api.export(await createResultsWorkbook(activity))) setExported(true); }
    catch { setError('导出失败，请检查保存位置是否可写，然后重试。'); }
    finally { setBusy(false); }
  }
  const total = activity.rounds.reduce((sum, r) => sum + r.winners.length, 0);
  return <Modal title="中奖记录" subtitle={`${activity.rounds.length} 轮抽奖，共产生 ${total} 个中奖名额`} onClose={onClose} wide busy={busy}>
    <div className="modal-body history-body">{!activity.rounds.length ? <div className="empty-history"><span className="upload-mark"><Users size={28} /></span><h3>幸运即将发生</h3><p>完成第一轮抽奖后，中奖记录会出现在这里。</p></div> :
      [...activity.rounds].reverse().map(round => <section className="history-round" key={round.id}>
        <div className="history-round-heading"><div><span className="round-pill">第 {String(round.index).padStart(2, '0')} 轮</span><h3>{round.title}</h3></div><time>{new Date(round.drawnAt).toLocaleString('zh-CN', { hour12: false })}</time></div>
        <div className="history-names">{round.winners.map(person => <span key={person.id}>{person.name}</span>)}</div>
        <p className="field-note">{round.winners.length} 人中奖{round.allowRepeat ? ' · 本轮允许往期中奖者参与' : ''}</p>
      </section>)}
      {error && <p className="inline-error" role="alert">{error}</p>}{exported && <p className="success-message" role="status"><Check size={15} />中奖记录已导出</p>}
    </div>
    <div className="modal-footer"><span className="muted footer-note">记录已保存在此设备</span><button className="button primary" disabled={busy || !activity.rounds.length} onClick={() => void exportResults()}><Download size={16} />{busy ? '正在导出…' : '导出 Excel'}</button></div>
  </Modal>;
}
