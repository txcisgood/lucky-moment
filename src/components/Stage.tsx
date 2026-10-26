import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Clock3, Maximize2, Minimize2, Play, Square } from 'lucide-react';
import type { Participant, Round, Settings } from '../core/lottery';
import { NameUniverse } from './NameUniverse';

export type Phase = 'idle' | 'rolling' | 'settling' | 'result';

export function Stage({ phase, settings, pool, round, seconds, fullscreen, onFullscreen, onStart, onStop, onNext,
  onImport, onExample, onSettings, busy, total, revealedCount, onRevealAll }: {
  phase: Phase; settings: Settings; pool: Participant[]; round?: Round; seconds: number;
  fullscreen: boolean; onFullscreen(): void; onStart(): void; onStop(): void; onNext(): void;
  onImport(): void; onExample(): void; onSettings(): void; busy: boolean; total: number;
  revealedCount: number; onRevealAll(): void;
}) {
  const isResult = phase === 'result' && round;
  const [visible, setVisible] = useState(120);
  useEffect(() => setVisible(120), [round?.id]);
  const roundIndex = isResult ? round.index : (round?.index ?? 0) + 1;
  const revealing = Boolean(isResult && revealedCount < isResult.winners.length);
  const status = phase === 'rolling' ? '姓名滚动中' : phase === 'settling' ? '正在揭晓' : isResult ? revealing ? '逐个揭晓中' : '本轮已揭晓' : '准备就绪';
  return <section className={`stage scheme-a-stage phase-${phase}`} aria-label="抽奖舞台">
    <div className="stage-toolbar"><button className="icon-button stage-expand" onClick={onFullscreen} aria-label={fullscreen ? '退出全屏' : '全屏展示'} title={fullscreen ? '退出全屏 Esc' : '全屏展示'}>{fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button></div>
    <div className="stage-heading"><h1>{isResult ? round.title : settings.title.trim() || '幸运之选'}</h1><p><span>第 {roundIndex} 轮</span><i aria-hidden="true" /><span className={phase === 'rolling' ? 'rolling-status' : ''}>{status}</span></p></div>
    <div className="sphere-scene">
      <NameUniverse pool={pool} phase={phase} animationSpeed={settings.animationSpeed} demo={total === 0} />
      {!isResult && <div className="sphere-caption">{!total ? <span>示例效果，导入名单后开始</span> : <><b>{pool.length.toLocaleString()} 位候选</b><span>，同场等待</span></>}</div>}
    </div>
    {isResult && <div className={`stage-center ${round.winners.length > 6 ? 'many-winners' : ''}`}>
      <p className="result-heading" aria-live="polite">{revealing ? `已揭晓 ${revealedCount} / ${round.winners.length} 位` : `本轮 ${round.winners.length.toLocaleString()} 位中奖者`}</p>
      <div className={`winner-grid ${round.winners.length === 1 ? 'single-winner' : ''} ${round.winners.length > 6 ? 'compact-winners' : ''}`} role="status" aria-label="本轮中奖结果">
        {round.winners.slice(0, Math.min(visible, revealedCount)).map((person, index) => <div className="winner" key={person.id}>
          {round.winners.length > 6 && <span className="winner-number">{index + 1}</span>}
          <span className={`winner-name ${person.name.length > 6 ? 'long-name' : ''}`}>{person.name}</span><span className="winner-tag">本轮中奖</span>
        </div>)}
      </div>
      {Math.min(revealedCount, round.winners.length) > visible && <button className="text-button show-more-winners" onClick={() => setVisible(current => current + 120)}>查看更多中奖者（共 {round.winners.length.toLocaleString()} 人）</button>}
    </div>}
    <div className="stage-controls">
      {phase === 'idle' && <>
        <div className="glass-control-dock"><button className="dock-setting" disabled={busy} onClick={onSettings}><span>本轮抽取</span><strong>{settings.count} 人<ChevronDown size={12} /></strong></button><button className="draw-button" onClick={onStart} disabled={busy || !pool.length || settings.count > pool.length}><Play size={17} fill="currentColor" />开始抽奖</button><button className="dock-setting mode-setting" disabled={busy} onClick={onSettings}><span>停止方式</span><strong>{settings.mode === 'manual' ? '手动停止' : `${settings.duration} 秒定时`}<ChevronDown size={12} /></strong></button></div>
        {!total ? <div className="stage-helper"><button className="inline-link" onClick={onImport}>导入名单</button><span className="helper-divider" /><button className="inline-link subtle" onClick={onExample}>体验示例</button></div> : !pool.length ? <p className="stage-helper">所有参与者都已中奖，可开启重复中奖或重新开始活动</p> : settings.count > pool.length ? <p className="stage-helper">剩余可抽 {pool.length} 人，请调整中奖人数</p> : <p className="stage-helper"><kbd>空格</kbd> 开始抽奖<span className="helper-divider" />{settings.allowRepeat ? '允许跨轮重复中奖' : '往期中奖者自动排除'}</p>}
      </>}
      {phase === 'rolling' && <><div className="glass-control-dock active-dock"><span className="live-indicator"><i />抽取 {settings.count} 人</span><button className="draw-button stop-button" onClick={onStop}><Square size={16} fill="currentColor" />{settings.mode === 'timed' ? `立即揭晓 · ${seconds}s` : '停止，揭晓幸运'}</button></div><p className="stage-helper">{settings.mode === 'timed' ? <><Clock3 size={13} />{seconds} 秒后自动停止，也可以提前揭晓</> : <><kbd>空格</kbd> 停止抽奖</>}</p></>}
      {phase === 'settling' && <><div className="glass-control-dock active-dock"><button className="draw-button" disabled><span className="spinner" />正在揭晓…</button></div><p className="stage-helper">即将揭晓本轮中奖名单</p></>}
      {isResult && <><div className="glass-control-dock result-dock">{revealing ? <button className="reveal-all-button" onClick={onRevealAll}>显示全部中奖者</button> : <span className="result-saved"><Check size={16} />本轮结果已保存</span>}<button className="draw-button next-button" disabled={busy} onClick={onNext}>继续下一轮<ArrowRight size={18} /></button></div><p className="stage-helper">{revealing ? '完整结果已保存，正在逐个展示' : '调整设置，开始下一轮抽奖'}</p></>}
    </div>
  </section>;
}
