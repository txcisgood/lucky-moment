import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, CircleHelp, Clock3, History, LockKeyhole, Maximize2, Minus, MousePointer2, Plus, RotateCcw, SlidersHorizontal, Upload, Users, X } from 'lucide-react';
import { api, persist } from './bridge';
import { drawRound, eligibleParticipants, MAX_PARTICIPANTS, newActivity } from './core/lottery';
import type { Activity, Participant, Settings } from './core/lottery';
import { HistoryDialog, ImportDialog, Modal, RosterDialog } from './components/Dialogs';
import { Stage } from './components/Stage';
import type { Phase } from './components/Stage';

type Dialog = 'import' | 'example' | 'roster' | 'history' | 'reset' | 'help' | null;
type Notice = { message: string; error: boolean } | null;

export function App() {
  const [activity, setActivity] = useState<Activity>(newActivity);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [modal, setModal] = useState<Dialog>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [mutating, setMutating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'draw' | 'display'>('draw');
  const [seconds, setSeconds] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const drawSnapshot = useRef<Activity | null>(null);
  const drawing = useRef(false);
  const stopping = useRef(false);
  const deadline = useRef(0);
  const currentActivity = useRef(activity);
  currentActivity.current = activity;
  const active = phase === 'rolling' || phase === 'settling';
  const settings = activity.settings;
  const pool = useMemo(() => eligibleParticipants(activity), [activity]);
  const wonCount = useMemo(() => new Set(activity.rounds.flatMap(r => r.winners.map(p => p.id))).size, [activity.rounds]);
  const lastRound = activity.rounds.at(-1);
  const revealing = phase === 'result' && Boolean(lastRound) && revealedCount < (lastRound?.winners.length ?? 0);
  const locked = active || revealing || mutating || !loaded;

  useEffect(() => {
    api.load().then(({ activity: saved, warning }) => {
      setActivity(saved); setLoaded(true);
      if (saved.rounds.length) { setRevealedCount(saved.rounds.at(-1)!.winners.length); setPhase('result'); }
      if (warning) setNotice({ message: warning, error: true });
    }).catch(() => { setLoaded(true); setSaveStatus('error'); setNotice({ message: '无法读取本地活动数据，请检查文件权限。', error: true }); });
    return api.onFullscreen(setFullscreen);
  }, []);

  useEffect(() => {
    if (!revealing || !lastRound) return;
    const timer = setInterval(() => setRevealedCount(current => Math.min(current + 1, lastRound.winners.length)), 700);
    return () => clearInterval(timer);
  }, [revealing, lastRound?.id, lastRound?.winners.length]);

  useEffect(() => api.onPrepareClose(async () => {
    if (!drawing.current) await persist(currentActivity.current);
  }), []);

  useEffect(() => {
    if (!settingsOpen) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest('.glass-settings, .settings-trigger, .dock-setting')) setSettingsOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [settingsOpen]);

  useEffect(() => {
    if (!loaded || active) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      persist(activity).then(() => setSaveStatus('saved')).catch(() => {
        setSaveStatus('error'); setNotice({ message: '自动保存失败，请检查磁盘空间和写入权限。', error: true });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [activity, loaded, active]);

  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    void api.setDrawActive(active).catch(() => undefined);
    const beforeUnload = (e: BeforeUnloadEvent) => { if (active) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [active]);

  function updateSettings(patch: Partial<Settings>) {
    if (locked) return;
    setActivity(current => ({ ...current, settings: { ...current.settings, ...patch } }));
  }

  async function start() {
    if (drawing.current || locked || phase !== 'idle' || modal) return;
    if (!pool.length || settings.count > pool.length) return;
    drawing.current = true; stopping.current = false; setMutating(true); setNotice(null);
    const snapshot = structuredClone(activity);
    try {
      await persist(snapshot);
      drawSnapshot.current = snapshot;
      deadline.current = Date.now() + snapshot.settings.duration * 1000;
      setSettingsOpen(false); setSeconds(snapshot.settings.duration); setPhase('rolling');
    } catch {
      drawing.current = false;
      setNotice({ message: '无法保存当前活动，请检查磁盘空间后再开始抽奖。', error: true });
    } finally { setMutating(false); }
  }

  const stop = useCallback(async () => {
    if (!drawing.current || stopping.current || !drawSnapshot.current) return;
    stopping.current = true; setPhase('settling');
    try {
      const next = drawRound(drawSnapshot.current);
      const delay = new Promise(resolve => setTimeout(resolve, matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 1100));
      await persist(next); // A result is shown only after the winning record is safely saved.
      await delay;
      setActivity(next);
      setRevealedCount(next.settings.revealMode === 'sequential' ? 1 : next.rounds.at(-1)!.winners.length);
      setPhase('result'); setSaveStatus('saved');
    } catch {
      setPhase('idle'); setNotice({ message: '本轮结果未能保存，抽奖未完成。请检查磁盘空间后重试。', error: true });
    } finally { drawing.current = false; stopping.current = false; drawSnapshot.current = null; }
  }, []);

  useEffect(() => {
    if (phase !== 'rolling' || drawSnapshot.current?.settings.mode !== 'timed') return;
    const update = () => { const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)); setSeconds(remaining); if (remaining <= 0) void stop(); };
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [phase, stop]);

  async function toggleFullscreen() {
    try { setSettingsOpen(false); setFullscreen(await api.toggleFullscreen()); }
    catch { setNotice({ message: '无法进入全屏，请使用应用窗口右上方的全屏按钮。', error: true }); }
  }

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (!modal && event.key === 'Escape' && settingsOpen) { event.preventDefault(); setSettingsOpen(false); return; }
      if (!modal && event.key === 'Escape' && fullscreen && api.platform !== 'browser') { void toggleFullscreen(); return; }
      if (modal || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(element.tagName) || element.isContentEditable) return;
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        if (phase === 'rolling') void stop();
        else if (phase === 'idle') void start();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  });

  async function commit(next: Activity) {
    setMutating(true);
    try { await persist(next); setActivity(next); setSaveStatus('saved'); }
    catch { throw new Error('保存失败，请检查磁盘空间和写入权限后重试。'); }
    finally { setMutating(false); }
  }

  async function importPeople(people: Participant[]) {
    await commit({ ...newActivity(), settings: { ...settings, count: Math.min(settings.count, people.length) }, participants: people });
    setPhase('idle'); setSettingsOpen(false); setModal(null); setNotice({ message: `已导入 ${people.length.toLocaleString()} 位参与者，幸运时刻已就绪。`, error: false });
  }
  async function savePeople(people: Participant[]) {
    await commit({ ...activity, participants: people }); setModal(null);
    if (!people.length) setPhase('idle');
    setNotice({ message: '参与名单已更新。', error: false });
  }
  async function reset() {
    try {
      await commit({ ...newActivity(), participants: activity.participants, settings });
      setPhase('idle'); setModal(null); setNotice({ message: '中奖记录已清空，名单已保留，可以重新开始。', error: false });
    } catch (e) { setNotice({ message: (e as Error).message, error: true }); }
  }

  return <div className={`app immersive-app scheme-a ${api.platform === 'darwin' ? 'platform-mac' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}>
    <header className="app-header"><div className="brand"><span className="brand-mark"><i /><i /><i /><i /></span><span>幸运时刻</span></div>
      <div className="header-actions"><button className="button ghost" disabled={locked || !activity.participants.length} onClick={() => setModal('roster')}><Users size={16} />名单管理</button><button className={`button ghost settings-trigger ${settingsOpen ? 'selected' : ''}`} disabled={locked} aria-expanded={settingsOpen} aria-controls="draw-settings" onClick={() => setSettingsOpen(!settingsOpen)}><SlidersHorizontal size={16} />抽奖设置</button><button className="button ghost" disabled={locked} onClick={() => setModal('history')}><History size={16} />中奖记录{activity.rounds.length > 0 && <span className="count-badge">{activity.rounds.length}</span>}</button><button className="button ghost header-import" disabled={locked} onClick={() => setModal('import')}><Upload size={15} />导入名单</button><button className="icon-button" aria-label="使用说明" disabled={locked} onClick={() => setModal('help')}><CircleHelp size={18} /></button><button className="icon-button" aria-label="全屏展示" onClick={() => void toggleFullscreen()}><Maximize2 size={18} /></button></div>
    </header>
    <main className="workspace">
      {settingsOpen && <div className="settings-scrim" aria-hidden="true" />}
      <aside id="draw-settings" className="sidebar glass-settings" hidden={!settingsOpen} aria-label="抽奖设置"><div className="sidebar-header"><span>抽奖设置</span><button className="icon-button" aria-label="收起抽奖设置" onClick={() => setSettingsOpen(false)}><X size={18} /></button></div><div className="settings-panel">
        <div className="panel-heading"><h2>{phase === 'result' ? '下轮设置' : '本轮设置'}</h2><span className="round-pill">第 {String(activity.rounds.length + 1).padStart(2, '0')} 轮</span></div>
        <div className="segmented settings-tabs" role="tablist" aria-label="抽奖设置分类"><button role="tab" id="draw-tab" aria-selected={settingsTab === 'draw'} aria-controls="draw-tabpanel" className={settingsTab === 'draw' ? 'selected' : ''} disabled={locked} onClick={() => setSettingsTab('draw')}>抽奖规则</button><button role="tab" id="display-tab" aria-selected={settingsTab === 'display'} aria-controls="display-tabpanel" className={settingsTab === 'display' ? 'selected' : ''} disabled={locked} onClick={() => setSettingsTab('display')}>动效与揭晓</button></div>
        <div id="draw-tabpanel" role="tabpanel" aria-labelledby="draw-tab" hidden={settingsTab !== 'draw'}>
        <div className="field-group"><label className="field-label" htmlFor="round-title">本轮名称</label><input id="round-title" value={settings.title} maxLength={80} disabled={locked} placeholder="例如：幸运之选" onChange={e => updateSettings({ title: e.target.value })} /></div>
        <div className="field-group"><label className="field-label" htmlFor="winner-count">中奖人数</label><div className="stepper"><button aria-label="减少中奖人数" disabled={locked || settings.count <= 1} onClick={() => updateSettings({ count: settings.count - 1 })}><Minus size={17} /></button><div><input id="winner-count" type="number" min="1" max={MAX_PARTICIPANTS} step="1" value={settings.count} disabled={locked} onChange={e => updateSettings({ count: Math.min(MAX_PARTICIPANTS, Math.max(1, Math.trunc(Number(e.target.value) || 1))) })} /><span>人</span></div><button aria-label="增加中奖人数" disabled={locked || settings.count >= MAX_PARTICIPANTS} onClick={() => updateSettings({ count: settings.count + 1 })}><Plus size={17} /></button></div></div>
        <div className="field-group"><span className="field-label" id="stop-mode-label">停止方式</span><div className="segmented" role="group" aria-labelledby="stop-mode-label"><button disabled={locked} aria-pressed={settings.mode === 'manual'} className={settings.mode === 'manual' ? 'selected' : ''} onClick={() => updateSettings({ mode: 'manual' })}><MousePointer2 size={15} />手动停止</button><button disabled={locked} aria-pressed={settings.mode === 'timed'} className={settings.mode === 'timed' ? 'selected' : ''} onClick={() => updateSettings({ mode: 'timed' })}><Clock3 size={15} />定时停止</button></div>
          {settings.mode === 'timed' ? <div className="duration-control"><label htmlFor="duration">滚动时长</label><div><input id="duration" type="number" min="1" max="3600" step="1" value={settings.duration} disabled={locked} onChange={e => updateSettings({ duration: Math.min(3600, Math.max(1, Math.trunc(Number(e.target.value) || 1))) })} /><span>秒</span></div></div> : <p className="field-note">由主持人决定，何时揭晓幸运。</p>}
        </div>
        </div><div id="display-tabpanel" role="tabpanel" aria-labelledby="display-tab" hidden={settingsTab !== 'display'}>
        <div className="field-group animation-preference"><div className="range-heading"><label className="field-label" htmlFor="animation-speed">动画速度</label><output htmlFor="animation-speed">{settings.animationSpeed}×</output></div><input id="animation-speed" type="range" min="0.5" max="2" step="0.25" value={settings.animationSpeed} disabled={locked} aria-valuetext={`${settings.animationSpeed} 倍速`} onChange={e => updateSettings({ animationSpeed: Number(e.target.value) })} /><div className="range-limits"><span>慢速 0.5×</span><span>快速 2×</span></div><p className="field-note">只调整姓名球的运动速度，不影响中奖概率。</p></div>
        <div className="field-group"><span className="field-label" id="reveal-mode-label">中奖名单揭晓方式</span><div className="segmented" role="group" aria-labelledby="reveal-mode-label"><button disabled={locked} aria-pressed={settings.revealMode === 'all'} className={settings.revealMode === 'all' ? 'selected' : ''} onClick={() => updateSettings({ revealMode: 'all' })}>全部揭晓</button><button disabled={locked} aria-pressed={settings.revealMode === 'sequential'} className={settings.revealMode === 'sequential' ? 'selected' : ''} onClick={() => updateSettings({ revealMode: 'sequential' })}>逐个揭晓</button></div><p className="field-note">{settings.revealMode === 'sequential' ? '每隔 0.7 秒揭晓一位，可随时显示全部名单。' : '停止后一次显示本轮所有中奖者。'}</p></div>
        </div>
        <div className="repeat-control"><div><label id="repeat-label" htmlFor="repeat-switch">允许重复中奖</label><p>已中奖者可参与后续轮次</p></div><button id="repeat-switch" type="button" role="switch" aria-checked={settings.allowRepeat} aria-labelledby="repeat-label" className={`toggle ${settings.allowRepeat ? 'on' : ''}`} disabled={locked} onClick={() => updateSettings({ allowRepeat: !settings.allowRepeat })}><span /></button></div>
      </div>
      <div className="roster-panel"><div className="panel-heading"><h2>参与名单</h2><span className="people-count">{activity.participants.length.toLocaleString()} 人</span></div>
        {activity.participants.length ? <><div className="roster-avatars" aria-hidden="true">{activity.participants.slice(0, 5).map(p => <span key={p.id}>{p.name.slice(0, 1)}</span>)}{activity.participants.length > 5 && <span className="avatar-more">+{activity.participants.length - 5}</span>}</div><button className="roster-link" disabled={locked} onClick={() => setModal('roster')}><span>查看与管理名单</span><ChevronRight size={16} /></button></> : <div className="roster-empty"><Users size={25} /><p>还没有参与者</p><span>导入名单，让幸运有名有姓。</span></div>}
        <button className="button import-button" disabled={locked} onClick={() => setModal('import')}><Upload size={17} />{activity.participants.length ? '重新导入名单' : '导入参与名单'}</button><p className="import-formats">Excel / TXT / 直接粘贴</p>
      </div>
      <button className="reset-button" disabled={locked || !activity.rounds.length} onClick={() => setModal('reset')}><RotateCcw size={14} />重新开始活动</button>
      </aside>
      <div className="main-panel"><div className="overview"><div><span>参与人数</span><strong>{activity.participants.length.toLocaleString()}<small>人</small></strong></div><i /><div><span>剩余可抽</span><strong className="eligible-count">{pool.length.toLocaleString()}<small>人</small></strong></div><i /><div><span>已中奖</span><strong>{wonCount.toLocaleString()}<small>人</small></strong></div></div>
        <Stage phase={phase} settings={settings} pool={drawSnapshot.current ? eligibleParticipants(drawSnapshot.current) : pool} round={lastRound} seconds={seconds} fullscreen={fullscreen}
          onFullscreen={() => void toggleFullscreen()} onStart={() => void start()} onStop={() => void stop()} onNext={() => { if (!locked) { setPhase('idle'); requestAnimationFrame(() => (document.activeElement as HTMLElement)?.blur()); } }} onImport={() => setModal('import')} onExample={() => setModal('example')} onSettings={() => { setSettingsTab('draw'); setSettingsOpen(true); }} busy={locked} total={activity.participants.length} revealedCount={revealedCount} onRevealAll={() => setRevealedCount(lastRound?.winners.length ?? 0)} />
      </div>
    </main>
    <footer className="app-footer"><span><LockKeyhole size={12} />本地离线 · 名单仅保存在此设备</span><span className={saveStatus === 'error' ? 'save-error' : ''}><i className={`save-dot ${saveStatus}`} />{saveStatus === 'saving' ? '正在保存' : saveStatus === 'error' ? '保存异常' : '活动已自动保存'}<span className="footer-version">幸运时刻 1.2</span></span></footer>
    {fullscreen && <div className="fullscreen-brand"><span className="brand-mark"><i /><i /><i /><i /></span>幸运时刻</div>}
    {notice && <div className={`toast ${notice.error ? 'toast-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{!notice.error && <Check size={17} />}<span>{notice.message}</span><button className="icon-button" aria-label="关闭提示" onClick={() => setNotice(null)}><X size={16} /></button></div>}
    {(modal === 'import' || modal === 'example') && <ImportDialog existing={Boolean(activity.participants.length || activity.rounds.length)} example={modal === 'example'} onImport={importPeople} onClose={() => setModal(null)} />}
    {modal === 'roster' && <RosterDialog activity={activity} onSave={savePeople} onClose={() => setModal(null)} />}
    {modal === 'history' && <HistoryDialog activity={activity} onClose={() => setModal(null)} />}
    {modal === 'reset' && <Modal title="重新开始活动？" subtitle="参与名单和抽奖设置会保留。" onClose={() => setModal(null)} busy={mutating}><div className="modal-body"><p className="confirm-description">本场 {activity.rounds.length} 轮中奖记录将被清空，所有参与者可重新参与抽奖。建议先导出需要保留的中奖记录。</p></div><div className="modal-footer"><button className="button secondary" disabled={mutating} onClick={() => setModal(null)}>取消</button><button className="button primary" disabled={mutating} onClick={() => void reset()}><RotateCcw size={16} />确认重新开始</button></div></Modal>}
    {modal === 'help' && <Modal title="开始你的幸运时刻" onClose={() => setModal(null)}><div className="modal-body help-body"><h3>导入名单</h3><p>Excel 使用第一张工作表的第一列，可包含“姓名”表头。TXT 和粘贴名单使用中文或英文逗号分隔，支持混用。</p><h3>设置与抽奖</h3><p>设置中奖人数，选择手动或定时停止。空格键可开始或停止，按钮获得焦点时也可用空格操作。全屏时按 Esc 返回。</p><h3>动画与揭晓</h3><p>动画速度支持 0.5–2 倍，不影响中奖概率。中奖名单可以全部揭晓，也可以每隔 0.7 秒揭晓一位；逐个揭晓时可点击“显示全部中奖者”立即显示。完整结果会先保存，重新打开应用时直接显示全部已保存的中奖者。</p><h3>重复中奖规则</h3><p>开关关闭时，所有往期中奖者都会排除；开启时可以继续参与。不论开关状态，同一轮同一位参与者最多中奖一次。同名记录若选择全部保留，会作为不同的参与者。</p><h3>保存与隐私</h3><p>名单、设置和中奖记录自动保存在本机。重新打开应用可以继续活动。中奖结果保存成功后才会显示，抽奖过程中请保持应用打开。</p></div><div className="modal-footer"><span /><button className="button primary" onClick={() => setModal(null)}>知道了</button></div></Modal>}
  </div>;
}
