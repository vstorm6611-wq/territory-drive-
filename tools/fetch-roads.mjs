// node tools/fetch-roads.mjs <lat> <lon> [radiusMeters=1000] [out=data/roads.json]
import { writeFileSync } from 'node:fs';
import { buildGraph } from './roadlib.mjs';

const [lat, lon, r = 1000, out = 'data/roads.json'] = process.argv.slice(2);
if (!lat || !lon) { console.error('usage: node tools/fetch-roads.mjs <lat> <lon> [radius] [out]'); process.exit(1); }
const cls = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service';
const q = `[out:json][timeout:60];way["highway"~"^(${cls})$"](around:${r},${lat},${lon});out body;>;out skel qt;`;
const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
let data;
for (const s of servers) {
  try {
    const res = await fetch(s, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    if (res.ok) { data = await res.json(); break; }
    console.error(s, res.status);
  } catch (e) { console.error(s, e.message); }
}
if (!data) process.exit(1);
const g = buildGraph(data, +lat, +lon);
writeFileSync(out, JSON.stringify(g));
console.log(`nodes=${g.nodes.length} edges=${g.edges.length} -> ${out}`);
