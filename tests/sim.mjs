// จำลองบอท 3 ตัว 5 นาทีในเกม เช็กว่าไม่ crash และมีการยึดพื้นที่จริง
import { readFileSync } from 'node:fs';
import * as turf from '@turf/turf';
globalThis.turf = turf;
const { loadGraph } = await import('../src/graph.js');
const { World, area } = await import('../src/game.js');
const w = new World(loadGraph(JSON.parse(readFileSync('data/roads.json'))), 0, 3);
const init = w.players.map(p => area(p.terr));
const t0 = Date.now();
for (let i = 0; i < 60 * 300; i++) w.step(1 / 60);
const res = w.players.map((p, i) => ({ i, pct: +(area(p.terr) / w.total * 100).toFixed(2), deaths: p.deaths, kills: p.kills }));
console.table(res);
const ok = res.every(r => isFinite(r.pct)) && w.players.some((p, i) => area(p.terr) > init[i] * 1.5 || p.kills > 0);
console.log(ok ? 'PASS' : 'FAIL', `(${Date.now() - t0} ms)`);
if (!ok) process.exit(1);
