export const MAX_PARTICIPANTS = 10_000;
export const MAX_NAME_LENGTH = 100;

export type Participant = { id: string; name: string };
export type Settings = {
  title: string; count: number; mode: 'manual' | 'timed'; duration: number; allowRepeat: boolean;
  animationSpeed: number; revealMode: 'all' | 'sequential';
};
export type Round = {
  id: string; index: number; title: string; drawnAt: string;
  winners: Participant[]; allowRepeat: boolean;
};
export type Activity = {
  version: 1; participants: Participant[]; rounds: Round[];
  settings: Settings; createdAt: string;
};

export function newActivity(): Activity {
  return {
    version: 1, participants: [], rounds: [], createdAt: new Date().toISOString(),
    settings: { title: '幸运之选', count: 1, mode: 'manual', duration: 5, allowRepeat: false, animationSpeed: 1, revealMode: 'all' },
  };
}

export function validateNames(values: string[]): string[] {
  const names = values.map(name => name.trim()).filter(Boolean);
  if (!names.length) throw new Error('没有识别到姓名，请检查名单内容。');
  if (names.length > MAX_PARTICIPANTS) throw new Error('每场活动最多支持 10,000 人，请缩减名单。');
  if (names.some(name => name.length > MAX_NAME_LENGTH)) throw new Error('单个姓名不能超过 100 个字符，请检查分隔符。');
  return names;
}

export function parseNames(text: string): string[] {
  return validateNames(text.replace(/^\uFEFF/, '').split(/[,，]/u));
}

export function duplicateNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) { if (seen.has(name)) duplicates.add(name); seen.add(name); }
  return [...duplicates];
}

export function participantsFromNames(names: string[], deduplicate: boolean): Participant[] {
  const cleaned = validateNames(names);
  return (deduplicate ? [...new Set(cleaned)] : cleaned).map(name => ({ id: crypto.randomUUID(), name }));
}

export function eligibleParticipants(activity: Activity, settings = activity.settings): Participant[] {
  if (settings.allowRepeat) return activity.participants;
  const won = new Set(activity.rounds.flatMap(round => round.winners.map(p => p.id)));
  return activity.participants.filter(p => !won.has(p.id));
}

/** Rejection sampling avoids modulo bias in the cryptographic random source. */
export function secureRandomInt(max: number): number {
  if (!Number.isSafeInteger(max) || max < 1 || max > 0x100000000) throw new Error('随机数范围无效。');
  const range = 0x100000000;
  const limit = range - (range % max);
  const bytes = new Uint32Array(1);
  let value: number;
  do { crypto.getRandomValues(bytes); value = bytes[0]; } while (value >= limit);
  return value % max;
}

export function drawRound(activity: Activity, randomInt = secureRandomInt): Activity {
  const { settings } = activity;
  const pool = [...eligibleParticipants(activity)];
  if (!Number.isInteger(settings.count) || settings.count < 1) throw new Error('中奖人数必须是大于 0 的整数。');
  if (settings.count > pool.length) throw new Error(`剩余可抽 ${pool.length} 人，请调整中奖人数。`);
  if (settings.mode === 'timed' && (!Number.isInteger(settings.duration) || settings.duration < 1 || settings.duration > 3600)) {
    throw new Error('滚动时间应为 1–3600 秒的整数。');
  }
  // Partial Fisher–Yates: one uniform sample without replacement, O(N + K).
  for (let i = 0; i < settings.count; i++) {
    const offset = randomInt(pool.length - i);
    if (!Number.isInteger(offset) || offset < 0 || offset >= pool.length - i) throw new Error('随机源返回了无效结果。');
    const j = i + offset;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const round: Round = {
    id: crypto.randomUUID(), index: activity.rounds.length + 1,
    title: settings.title.trim() || '幸运之选', drawnAt: new Date().toISOString(),
    winners: pool.slice(0, settings.count), allowRepeat: settings.allowRepeat,
  };
  return { ...activity, rounds: [...activity.rounds, round] };
}

/** Validate persisted data rather than trusting a local file or renderer IPC. */
export function validateActivity(value: unknown): Activity {
  if (!value || typeof value !== 'object') throw new Error('活动数据格式无效。');
  const a = value as Activity;
  const validPerson = (p: Participant) => p && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 100
    && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= MAX_NAME_LENGTH;
  if (a.version !== 1 || !Array.isArray(a.participants) || a.participants.length > MAX_PARTICIPANTS
    || !a.participants.every(validPerson) || new Set(a.participants.map(p => p.id)).size !== a.participants.length
    || !Array.isArray(a.rounds) || a.rounds.length > 10000
    || typeof a.createdAt !== 'string' || !Number.isFinite(Date.parse(a.createdAt))) throw new Error('保存的活动数据不完整。');
  const s = a.settings;
  if (!s || typeof s.title !== 'string' || s.title.length > 80 || !Number.isInteger(s.count) || s.count < 1 || s.count > MAX_PARTICIPANTS
    || !['manual', 'timed'].includes(s.mode) || !Number.isInteger(s.duration) || s.duration < 1 || s.duration > 3600
    || typeof s.allowRepeat !== 'boolean') throw new Error('保存的抽奖设置无效。');
  // Existing version-1 activities predate these presentation preferences.
  const animationSpeed = s.animationSpeed === undefined ? 1 : s.animationSpeed;
  const revealMode = s.revealMode === undefined ? 'all' : s.revealMode;
  if (!Number.isFinite(animationSpeed) || animationSpeed < .5 || animationSpeed > 2
    || !Number.isInteger(animationSpeed * 4) || !['all', 'sequential'].includes(revealMode)) {
    throw new Error('保存的动画或揭晓设置无效。');
  }
  for (const [i, round] of a.rounds.entries()) {
    if (!round || typeof round.id !== 'string' || typeof round.title !== 'string' || round.title.length > 80
      || round.index !== i + 1 || !Number.isFinite(Date.parse(round.drawnAt)) || typeof round.allowRepeat !== 'boolean'
      || !Array.isArray(round.winners) || !round.winners.length || round.winners.length > MAX_PARTICIPANTS || !round.winners.every(validPerson)
      || new Set(round.winners.map(p => p.id)).size !== round.winners.length) throw new Error('保存的中奖记录无效。');
  }
  return { ...a, settings: { ...s, animationSpeed, revealMode } };
}
