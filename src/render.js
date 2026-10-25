import { area } from './game.js';

function ring(ctx, r) { r.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }

export function draw(ctx, world, cam, W, H) {
  const s = cam.s, g = world.g;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-cam.x, -cam.y);
  const vx = W / 2 / s + 50, vy = H / 2 / s + 50;

  ctx.beginPath();
  for (let i = 0; i < g.length; i++) {
    const n = g[i];
    if (Math.abs(n.x - cam.x) > vx || Math.abs(n.y - cam.y) > vy) continue;
    for (const { to } of n.adj) if (to > i) { ctx.moveTo(n.x, n.y); ctx.lineTo(g[to].x, g[to].y); }
  }
  ctx.strokeStyle = '#4a4f59'; ctx.lineWidth = 4.8 / s; ctx.stroke();

  for (const p of world.players) {
    if (!p.terr) continue;
    const geo = p.terr.geometry, ps = geo.type === 'Polygon' ? [geo.coordinates] : geo.coordinates;
    ctx.beginPath();
    for (const poly of ps) for (const r of poly) ring(ctx, r);
    ctx.globalAlpha = 0.3; ctx.fillStyle = p.color; ctx.fill('evenodd');
    ctx.globalAlpha = 1; ctx.strokeStyle = p.color; ctx.lineWidth = 2 / s; ctx.stroke();
  }
  for (const p of world.players) {
    if (p.outside && p.trail.length) {
      ctx.beginPath();
      p.trail.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.lineTo(p.car.x, p.car.y);
      ctx.strokeStyle = p.color; ctx.lineWidth = 6 / s; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.beginPath(); ctx.arc(p.car.x, p.car.y, Math.max(4, 7 / s), 0, 7);
    ctx.fillStyle = p.color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / s; ctx.stroke();
  }
  ctx.restore();
}

export function hudHTML(world) {
  return world.players.map((p, i) =>
    `<span style="color:${p.color}">●</span> ${p.bot ? 'BOT' + i : 'YOU'} ${(area(p.terr) / world.total * 100).toFixed(1)}% ☠${p.deaths}`).join('<br>');
}
