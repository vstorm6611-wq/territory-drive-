// แปลงผล Overpass (nodes+ways) -> {nodes:[[x,y]],edges:[[i,j]]} หน่วยเมตร (x ไปทางตะวันออก, y ลงล่าง = ใต้)
export function prune(nodes, edges) {
  const adj = nodes.map(() => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const comp = new Array(nodes.length).fill(-1), sizes = [];
  for (let s = 0; s < nodes.length; s++) {
    if (comp[s] !== -1) continue;
    const id = sizes.length; let c = 0; const st = [s]; comp[s] = id;
    while (st.length) { const u = st.pop(); c++; for (const v of adj[u]) if (comp[v] === -1) { comp[v] = id; st.push(v); } }
    sizes.push(c);
  }
  const best = sizes.indexOf(Math.max(...sizes)), map = new Map(), out = [];
  nodes.forEach((p, i) => { if (comp[i] === best) { map.set(i, out.length); out.push(p); } });
  const e = edges.filter(([a]) => comp[a] === best).map(([a, b]) => [map.get(a), map.get(b)]);
  return { nodes: out, edges: e };
}

export function buildGraph(op, lat0, lon0) {
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  const pts = new Map(), idx = new Map(), nodes = [], edges = [];
  for (const el of op.elements) if (el.type === 'node') pts.set(el.id, [(el.lon - lon0) * kx, -(el.lat - lat0) * ky]);
  const id = n => {
    if (!idx.has(n)) { idx.set(n, nodes.length); const [x, y] = pts.get(n); nodes.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]); }
    return idx.get(n);
  };
  for (const el of op.elements) {
    if (el.type !== 'way') continue;
    for (let i = 0; i < el.nodes.length - 1; i++)
      if (pts.has(el.nodes[i]) && pts.has(el.nodes[i + 1])) edges.push([id(el.nodes[i]), id(el.nodes[i + 1])]);
  }
  return prune(nodes, edges);
}
