import assert from 'node:assert';
import { buildGraph } from '../tools/roadlib.mjs';
const op = { elements: [
  { type: 'node', id: 1, lat: 13.0, lon: 100.0 }, { type: 'node', id: 2, lat: 13.0, lon: 100.001 },
  { type: 'node', id: 3, lat: 13.001, lon: 100.001 }, { type: 'node', id: 9, lat: 14, lon: 101 }, { type: 'node', id: 10, lat: 14.001, lon: 101 },
  { type: 'way', id: 1, nodes: [1, 2, 3] }, { type: 'way', id: 2, nodes: [9, 10] } ] };
const g = buildGraph(op, 13.0, 100.0);
assert.equal(g.nodes.length, 3);               // component เล็กถูกตัดทิ้ง
assert.equal(g.edges.length, 2);
assert.ok(Math.abs(g.nodes[1][0] - 108.4) < 1);  // 0.001° lon ≈ 108 ม. ที่ละติจูด 13°
assert.ok(g.nodes[2][1] < 0);                  // เหนือ = y ติดลบ
console.log('roadlib PASS');
