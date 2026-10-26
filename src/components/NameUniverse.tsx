import { useEffect, useRef } from 'react';
import type { Participant } from '../core/lottery';
import type { Phase } from './Stage';

const DEMO_NAMES = ['林','陈','李','周','沈','许','王','赵','吴','徐','何','陆']
  .flatMap(surname => ['知夏','予安','星禾','书遥','以宁','景行','思远','沐言'].map(given => surname + given));
type Point = { x: number; y: number; z: number; index: number };
type Label = { x: number; y: number; z: number; text: string; size: number; halfWidth: number };

function spherePoints(count: number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - 2 * (index + .5) / count;
    const radius = Math.sqrt(1 - y * y);
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, index };
  });
}

/** A bounded visual sample; selection always uses the independent lottery core. */
export function NameUniverse({ pool, phase, animationSpeed, demo }: {
  pool: Participant[]; phase: Phase; animationSpeed: number; demo: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const repaint = useRef<(() => void) | null>(null);
  const live = useRef({ pool, phase, animationSpeed, demo });
  live.current = { pool, phase, animationSpeed, demo };

  useEffect(() => {
    const element = canvas.current;
    const container = element?.parentElement;
    const context = element?.getContext('2d', { alpha: true });
    if (!element || !container || !context) return;
    const ctx = context;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motion.matches, disposed = false;
    let width = 0, height = 0, previous = 0, request = 0, frame = 0;
    let rotation = .34, tick = 0, speed = .09;
    let sprites: Point[] = [], spriteCount = -1;

    function resize() {
      const rect = container!.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element!.width = Math.round(width * ratio); element!.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint(0);
    }

    function paint(delta: number) {
      if (disposed || width < 1 || height < 1) return;
      const { pool: participants, phase: state, animationSpeed: multiplier, demo: showDemo } = live.current;
      const length = showDemo ? DEMO_NAMES.length : participants.length;
      const amount = Math.min(128, length);
      if (amount !== spriteCount) { spriteCount = amount; sprites = spherePoints(amount); }
      const target = state === 'rolling' ? 1.8 : state === 'settling' ? .025 : state === 'result' ? .04 : .09;
      speed += (target - speed) * Math.min(1, delta * 3);
      if (!reduced) { rotation += delta * speed * multiplier; tick += delta * multiplier; }
      ctx.clearRect(0, 0, width, height);
      const radius = Math.min(width * .37, height * .445, 360);
      const cx = width * .5, cy = height * .48;
      const shade = ctx.createRadialGradient(cx - radius * .28, cy - radius * .3, 0, cx, cy, radius);
      shade.addColorStop(0, '#232329'); shade.addColorStop(.73, '#1a1a20'); shade.addColorStop(1, '#141418');
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = shade; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.strokeStyle = '#ffffff24'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, radius + 7, 0, Math.PI * 2); ctx.strokeStyle = '#ffffff08'; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.19);
      for (const scale of [.24, .53, .79]) {
        ctx.beginPath(); ctx.ellipse(0, 0, radius * scale, radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
      const cos = Math.cos(rotation), sin = Math.sin(rotation), tilt = .16;
      const offset = Math.floor(tick * .7) * amount;
      const labels = sprites.map(point => {
        const x = point.x * cos + point.z * sin, rz = point.z * cos - point.x * sin;
        const y = point.y * Math.cos(tilt) - rz * Math.sin(tilt);
        const z = point.y * Math.sin(tilt) + rz * Math.cos(tilt);
        const scale = 1 / (1.5 - z * .27);
        const nameIndex = (point.index + offset) % length;
        const fullName = showDemo ? DEMO_NAMES[nameIndex] : participants[nameIndex].name;
        const characters = Array.from(fullName);
        const text = characters.length > 9 ? `${characters.slice(0, 4).join('')}…${characters.slice(-4).join('')}` : fullName;
        const size = Math.max(12, radius * (.05 + .014 * (z + 1)));
        ctx.font = `450 ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
        return { text, x: cx + x * radius * 1.18 * scale, y: cy + y * radius * 1.18 * scale, z, size, halfWidth: ctx.measureText(text).width / 2 };
      }).sort((a, b) => b.z - a.z);
      const visible: Label[] = [];
      const spacing = radius < 170 ? 3 : 6;
      for (const point of labels) {
        // Include the text's whole bounds in the shared sphere, and keep names apart.
        if (Math.hypot(Math.abs(point.x - cx) + point.halfWidth, Math.abs(point.y - cy) + point.size * .55) > radius - 8) continue;
        if (visible.some(other => Math.abs(point.x - other.x) < point.halfWidth + other.halfWidth + spacing
          && Math.abs(point.y - other.y) < (point.size + other.size) * .55 + spacing)) continue;
        visible.push(point);
      }
      for (const point of visible.reverse()) {
        ctx.font = `450 ${point.size}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = `rgba(244,241,247,${Math.min(1, .55 + (point.z + 1) * .225)})`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(point.text, point.x, point.y);
      }
      const angle = rotation * .62 - .85;
      ctx.beginPath(); ctx.arc(cx, cy, radius + 1, angle, angle + .43); ctx.strokeStyle = '#f77582'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 3, 0, Math.PI * 2); ctx.fillStyle = '#f77582'; ctx.fill();
      element!.dataset.sprites = String(amount);
      element!.dataset.visibleNames = String(visible.length);
      if (++frame % 30 === 0) element!.dataset.frame = String(frame);
    }
    function animate(timestamp: number) {
      const delta = previous ? Math.min((timestamp - previous) / 1000, .05) : 0;
      previous = timestamp; paint(delta);
      if (!document.hidden && !reduced && !disposed) request = requestAnimationFrame(animate);
    }
    function resume() {
      cancelAnimationFrame(request); previous = 0;
      if (!document.hidden && !reduced) request = requestAnimationFrame(animate); else paint(0);
    }
    function onMotionChange(event: MediaQueryListEvent) { reduced = event.matches; resume(); }
    const observer = new ResizeObserver(resize); observer.observe(container);
    motion.addEventListener('change', onMotionChange); document.addEventListener('visibilitychange', resume);
    repaint.current = () => paint(0); resize(); resume();
    return () => {
      disposed = true; repaint.current = null; cancelAnimationFrame(request); observer.disconnect();
      motion.removeEventListener('change', onMotionChange); document.removeEventListener('visibilitychange', resume);
    };
  }, []);
  useEffect(() => { repaint.current?.(); }, [pool, phase, animationSpeed, demo]);
  return <canvas ref={canvas} className="name-universe" role="img" aria-label={phase === 'rolling' || phase === 'settling' ? '姓名滚动中' : '缓缓旋转的姓名星球'} data-phase={phase} data-speed={animationSpeed} />;
}
