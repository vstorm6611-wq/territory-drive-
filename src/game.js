// logic ล้วน (ไม่แตะ DOM) — ใช้ global `turf`; พิกัดเป็นเมตรแบบ planar
import { bfs, trace } from './graph.js';

export const SPEED = 18;      // m/s
export const R0 = 38;         // ครึ่งด้านของเขตเริ่มต้น
export const COLORS = ['#ff5252', '#4fc3f7', '#ffd54f', '#81c784'];

export function area(f) {
  if (!f) return 0;
  const g = f.geometry, ps = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  let t = 0;
  for (const p of ps) p.forEach((r, i) => {
    let s = 0;
    for (let k = 0; k < r.length - 1; k++) s += r[k][0] * r[k + 1][1] - r[k + 1][0] * r[k][1];
    t += (i ? -1 : 1) * Math.abs(s / 2);
  });
  return t;
}

const sq = (x, y, r) => turf.polygon([[[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r], [x - r, y - r]]]);
const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
const segHit = (a, b, c, d) => orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
const trailHit = (a, b, tr, skip = 0) => {
  for (let i = 0; i < tr.length - 1 - skip; i++) if (segHit(a, b, tr[i], tr[i + 1])) return true;
  return false;
};
const simp = f => turf.simplify(f, { tolerance: 0.3, highQuality: false });

export class Car {
  constructor(g, n) {
    this.g = g; this.a = n; this.b = g[n].adj[0].to; this.d = 0; this.want = null; this.route = [];
    this.upd();
  }
  get L() { const A = this.g[this.a], B = this.g[this.b]; return Math.hypot(B.x - A.x, B.y - A.y); }
  dir(a, b) {
    const A = this.g[a], B = this.g[b], l = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    return [(B.x - A.x) / l, (B.y - A.y) / l];
  }
  upd() {
    const A = this.g[this.a], B = this.g[this.b], t = this.d / (this.L || 1);
    this.x = A.x + (B.x - A.x) * t; this.y = A.y + (B.y - A.y) * t;
  }
  step(dt) {
    let m = SPEED * dt;
    for (let k = 0; m > 0 && k < 50; k++) {
      const L = this.L;
      if (this.d + m < L) { this.d += m; break; }
      m -= L - this.d;
      const prev = this.a; this.a = this.b; this.d = 0; this.b = this.pick(prev);
    }
    this.upd();
  }
  pick(prev) {
    const adj = this.g[this.a].adj;
    while (this.route.length) {
      const n = this.route.shift();
      if (adj.some(e => e.to === n)) return n;
    }
    const opts = adj.filter(e => e.to !== prev), c = opts.length ? opts : adj;
    const w = this.want || this.dir(prev, this.a);
    this.want = null;
    let best = c[0].to, bs = -9;
    for (const { to } of c) {
      const v = this.dir(this.a, to), s = v[0] * w[0] + v[1] * w[1];
      if (s > bs) { bs = s; best = to; }
    }
    return best;
  }
  turn(w) {
    const h = this.dir(this.a, this.b);
    if (h[0] * w[0] + h[1] * w[1] < -0.7 && this.d > 1) {           // กลับรถกลางถนน
      this.d = this.L - this.d; [this.a, this.b] = [this.b, this.a];
      this.route = []; this.want = null;
    } else this.want = w;
  }
}

class Player {
  constructor(w, i, bot, home) {
    Object.assign(this, { w, i, bot, home, color: COLORS[i % 4], trail: [], outside: false, kills: 0, deaths: 0, visited: new Set() });
    this.spawn(home);
  }
  spawn(home) {
    this.home = home; this.car = new Car(this.w.g, home);
    const n = this.w.g[home];
    this.setTerr(sq(n.x, n.y, R0)); this.last = [n.x, n.y];
  }
  setTerr(f) { this.terr = f; this.bbox = f ? turf.bbox(f) : null; }
  inside(x, y) {
    const b = this.bbox;
    return !!b && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && turf.booleanPointInPolygon([x, y], this.terr);
  }
  update(prev) {
    const c = this.car, pos = [c.x, c.y];
    if (this.inside(c.x, c.y)) {
      if (this.outside) { this.trail.push(pos); this.claim(); this.outside = false; this.trail = []; this.visited.clear(); }
      this.last = pos;
    } else {
      if (!this.outside) { this.outside = true; this.trail = [this.last]; }
      const t = this.trail, l = t[t.length - 1];
      if (Math.hypot(pos[0] - l[0], pos[1] - l[1]) > 4) t.push(pos);
      if (trailHit(prev, pos, t, 3)) return this.die();
    }
    for (const q of this.w.players) {
      if (q !== this && q.outside && trailHit(prev, pos, [...q.trail, [q.car.x, q.car.y]])) { q.die(); this.kills++; }
    }
  }
  claim() {
    const t = this.trail;
    if (t.length < 3) return;
    try {
      let a = null;
      for (const f of turf.unkinkPolygon(turf.polygon([[...t, t[0]]])).features)
        a = a ? turf.union(turf.featureCollection([a, f])) : f;
      if (!a || area(a) < 1) return;
      this.setTerr(simp(turf.union(turf.featureCollection([this.terr, a]))));
      for (const e of this.w.players) {
        if (e === this || !e.terr) continue;
        const d = turf.difference(turf.featureCollection([e.terr, a]));
        e.setTerr(d ? simp(d) : null);
        if (!d) e.die();
      }
    } catch (err) { console.warn('claim failed', err); }
  }
  die() {
    this.deaths++; this.outside = false; this.trail = []; this.visited.clear();
    this.spawn(this.terr ? this.home : this.w.rand());
  }
  think() {                                   // บอท: ออกไปวน แล้วกลับเข้าเขตคนละเส้นทาง
    const c = this.car, g = this.w.g, s = c.b;
    if (c.route.length) return;
    if (!this.outside) {
      const r = bfs(g, s, { maxDepth: 10 }), cand = r.order.filter(u => r.dep.get(u) >= 5);
      if (!cand.length) return;
      const path = trace(r.prev, cand[Math.random() * cand.length | 0]);
      path.forEach(n => this.visited.add(n));
      c.route = path.slice(1);
    } else {
      const goal = u => this.inside(g[u].x, g[u].y);
      let r = bfs(g, s, { skip: this.visited, goal });
      if (!r.path) r = bfs(g, s, { goal });
      if (r.path) c.route = r.path.slice(1);
    }
  }
}

export class World {
  constructor(g, humans = 1, bots = 2) {
    this.g = g; this.t = 0;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const n of g) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    this.total = w * h;
    const spots = [[-.3, -.3], [.3, .3], [.3, -.3], [-.3, .3]];
    this.players = [];
    for (let i = 0; i < humans + bots; i++)
      this.players.push(new Player(this, i, i >= humans, this.nearest(cx + spots[i][0] * w, cy + spots[i][1] * h)));
  }
  nearest(x, y) {
    let b = 0, bd = 1e18;
    this.g.forEach((n, i) => { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (n.adj.length && d < bd) { bd = d; b = i; } });
    return b;
  }
  rand() { let i; do i = Math.random() * this.g.length | 0; while (!this.g[i].adj.length); return i; }
  input(p, dx, dy) { p.car.turn([dx, dy]); }
  step(dt) {
    this.t += dt;
    for (const p of this.players) {
      if (p.bot) p.think();
      const px = p.car.x, py = p.car.y;
      p.car.step(dt);
      p.update([px, py]);
    }
  }
}
