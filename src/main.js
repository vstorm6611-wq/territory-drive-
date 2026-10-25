import { loadGraph } from './graph.js';
import { World } from './game.js';
import { draw, hudHTML } from './render.js';

const cv = document.getElementById('c'), hud = document.getElementById('hud'), ctx = cv.getContext('2d');
let world, W = 0, H = 0, zoom = 2.2;

function resize() {
  const d = devicePixelRatio || 1;
  W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener('resize', resize); resize();

const KEYS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
addEventListener('keydown', e => {
  const v = KEYS[e.key.length > 1 ? e.key : e.key.toLowerCase()];
  if (v && world) { world.input(world.players[0], ...v); e.preventDefault(); }
});
let t0 = null;
cv.addEventListener('pointerdown', e => { t0 = [e.clientX, e.clientY]; });
cv.addEventListener('pointerup', e => {
  if (!t0 || !world) return;
  const dx = e.clientX - t0[0], dy = e.clientY - t0[1]; t0 = null;
  if (Math.hypot(dx, dy) < 20) return;
  world.input(world.players[0], ...(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]));
});
cv.addEventListener('wheel', e => { zoom = Math.min(6, Math.max(0.6, zoom * (e.deltaY > 0 ? 0.9 : 1.1))); e.preventDefault(); }, { passive: false });

const DT = 1 / 60; let acc = 0, last = 0, n = 0;
function loop(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;      // กัน tab ค้างแล้วกระโดด
  while (acc >= DT) { world.step(DT); acc -= DT; }
  const c = world.players[0].car;
  draw(ctx, world, { x: c.x, y: c.y, s: zoom }, W, H);
  if (++n % 10 === 0) hud.innerHTML = hudHTML(world) + '<br><small>ลูกศร/WASD/ปัดนิ้ว · ล้อเมาส์ซูม</small>';
  requestAnimationFrame(loop);
}

(async () => {
  try {
    const r = await fetch('data/roads.json');
    if (!r.ok) throw new Error(r.status);
    world = new World(loadGraph(await r.json()), 1, 2);
  } catch (e) {
    hud.textContent = 'โหลด data/roads.json ไม่ได้ — ต้องรันผ่าน server (npm start)'; return;
  }
  requestAnimationFrame(t => { last = t; loop(t); });
})();
