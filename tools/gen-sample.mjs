// สร้างแผนที่ตัวอย่าง (ตารางถนนบิดเบี้ยว) -> data/roads.json
import { writeFileSync } from 'node:fs';
import { prune } from './roadlib.mjs';
let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const N = 18, G = 90, nodes = [], edges = [], id = (i, j) => i * N + j;
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
  nodes.push([+((j - N / 2) * G + (rnd() - .5) * 30).toFixed(1), +((i - N / 2) * G + (rnd() - .5) * 30).toFixed(1)]);
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  if (j + 1 < N && rnd() > .1) edges.push([id(i, j), id(i, j + 1)]);
  if (i + 1 < N && rnd() > .1) edges.push([id(i, j), id(i + 1, j)]);
}
const g = prune(nodes, edges);
writeFileSync('data/roads.json', JSON.stringify(g));
console.log(`nodes=${g.nodes.length} edges=${g.edges.length}`);
