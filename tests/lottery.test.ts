import test from 'node:test';
import assert from 'node:assert/strict';
import { drawRound, duplicateNames, eligibleParticipants, newActivity, parseNames, participantsFromNames, secureRandomInt, validateActivity } from '../src/core/lottery';
import type { Activity } from '../src/core/lottery';

const fixture = (count = 20): Activity => ({ ...newActivity(), participants: participantsFromNames(Array.from({ length: count }, (_, i) => `参与者${i + 1}`), false) });

test('TXT/粘贴支持中英文逗号混用、BOM、空项和首尾空格', () => {
  assert.deepEqual(parseNames('\uFEFF 张三, 李四 ， 王五,,， \n陈六 \n'), ['张三', '李四', '王五', '陈六']);
  assert.throws(() => parseNames(',， ,'), /没有识别/);
});
test('导入限制保护 10,000 人与超长姓名边界', () => {
  assert.equal(parseNames(Array(10000).fill('姓名').join(',')).length, 10000);
  assert.throws(() => parseNames(Array(10001).fill('姓名').join(',')), /10,000/);
  assert.throws(() => parseNames('a'.repeat(101)), /100/);
});
test('同名人员可合并，也可作为独立身份保留', () => {
  assert.deepEqual(duplicateNames(['张三', '李四', '张三', '李四', '李四']), ['张三', '李四']);
  const people = participantsFromNames(['张三', '张三'], false);
  assert.equal(people.length, 2); assert.notEqual(people[0].id, people[1].id);
  assert.equal(participantsFromNames(['张三', '张三'], true).length, 1);
});
test('跨轮排除中奖者，直到抽完，且保留历史快照', () => {
  let activity = fixture(12);
  activity.settings.count = 4;
  for (let i = 0; i < 3; i++) activity = drawRound(activity);
  const ids = activity.rounds.flatMap(r => r.winners.map(p => p.id));
  assert.equal(ids.length, 12); assert.equal(new Set(ids).size, 12);
  assert.equal(eligibleParticipants(activity).length, 0);
  assert.throws(() => drawRound(activity), /剩余可抽/);
  assert.equal(activity.rounds[2].index, 3);
});
test('开启重复可参与往期轮次，关闭后排除所有历史中奖者', () => {
  let activity = fixture(3);
  activity.settings.count = 3;
  activity = drawRound(activity);
  activity = { ...activity, settings: { ...activity.settings, allowRepeat: true } };
  assert.equal(eligibleParticipants(activity).length, 3);
  activity = drawRound(activity);
  assert.equal(new Set(activity.rounds[1].winners.map(p => p.id)).size, 3);
  activity = { ...activity, settings: { ...activity.settings, allowRepeat: false } };
  assert.equal(eligibleParticipants(activity).length, 0);
  assert.equal(activity.rounds.length, 2);
});
test('选择算法不改变原名单，每个合法随机分支均可到达', () => {
  const original = fixture(3); original.settings.count = 2;
  const ids = original.participants.map(p => p.id);
  const outcomes = new Set<string>();
  for (let first = 0; first < 3; first++) for (let second = 0; second < 2; second++) {
    let position = 0; const choices = [first, second];
    const result = drawRound(original, () => choices[position++]);
    outcomes.add(result.rounds[0].winners.map(p => p.id).join(','));
  }
  assert.equal(outcomes.size, 6);
  assert.deepEqual(original.participants.map(p => p.id), ids);
  assert.equal(original.rounds.length, 0);
});
test('无效人数、时长和随机源会被拒绝', () => {
  const a = fixture(2);
  for (const count of [0, -1, .5, NaN, 3]) assert.throws(() => drawRound({ ...a, settings: { ...a.settings, count } }));
  assert.throws(() => drawRound({ ...a, settings: { ...a.settings, mode: 'timed', duration: 0 } }), /滚动时间/);
  assert.throws(() => drawRound(a, () => 2), /随机源/);
});
test('10,000 人一次全抽，身份没有遗漏或重复', () => {
  const a = fixture(10000); a.settings.count = 10000;
  const result = drawRound(a);
  assert.equal(new Set(result.rounds[0].winners.map(p => p.id)).size, 10000);
  assert.equal(eligibleParticipants(result).length, 0);
});
test('安全随机数覆盖范围并校验边界', () => {
  for (let i = 0; i < 1000; i++) { const value = secureRandomInt(7); assert.ok(value >= 0 && value < 7 && Number.isInteger(value)); }
  assert.equal(secureRandomInt(1), 0);
  assert.throws(() => secureRandomInt(0)); assert.throws(() => secureRandomInt(1.5));
});
test('持久化校验拒绝损坏数据、重复身份与同轮重复中奖', () => {
  const a = drawRound(fixture());
  assert.equal(validateActivity(JSON.parse(JSON.stringify(a))).rounds.length, 1);
  assert.throws(() => validateActivity({ ...a, version: 999 }));
  assert.throws(() => validateActivity({ ...a, participants: [a.participants[0], a.participants[0]] }));
  const broken = structuredClone(a); broken.rounds[0].winners.push(broken.rounds[0].winners[0]);
  assert.throws(() => validateActivity(broken));
});

test('旧活动补全展示设置，并保留参与者、中奖记录和原设置', () => {
  const original = drawRound(fixture(8));
  const legacy = JSON.parse(JSON.stringify(original));
  delete legacy.settings.animationSpeed; delete legacy.settings.revealMode;
  const loaded = validateActivity(legacy);
  assert.deepEqual(loaded.participants, original.participants);
  assert.deepEqual(loaded.rounds, original.rounds);
  assert.deepEqual(loaded.settings, original.settings);
  assert.equal('animationSpeed' in legacy.settings, false);
});

test('动画速度和逐个揭晓设置可保存，且不影响同一随机分支的中奖结果', () => {
  const original = fixture(10); original.settings.count = 3;
  const adjusted = { ...original, settings: { ...original.settings, animationSpeed: 2, revealMode: 'sequential' as const } };
  assert.equal(validateActivity(adjusted).settings.animationSpeed, 2);
  assert.equal(validateActivity(adjusted).settings.revealMode, 'sequential');
  assert.deepEqual(drawRound(adjusted, () => 0).rounds[0].winners, drawRound(original, () => 0).rounds[0].winners);
  for (const speed of [0, .4, .6, 2.25, NaN, null, '1']) {
    assert.throws(() => validateActivity({ ...original, settings: { ...original.settings, animationSpeed: speed } }));
  }
  assert.throws(() => validateActivity({ ...original, settings: { ...original.settings, revealMode: 'invalid' } }));
});
