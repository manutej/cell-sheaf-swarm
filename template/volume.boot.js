/* volume.boot.js — design template. Load after volume.paint.js. JSON is the sheaf. */
function hit(px, py) {
  let best = null, bd = coarse ? 20 : 14;
  for (const n of L.nodes) {
    const top = project({ x: n.x, y: n.y + n.h, z: n.z });
    const bot = project({ x: n.x, y: n.y, z: n.z });
    const dt = Math.hypot(top.x - px, top.y - py);
    const db = Math.hypot(bot.x - px, bot.y - py);
    if (dt < bd) { bd = dt; best = { k: "cap", n }; }
    if (db < bd) { bd = db; best = { k: "base", n }; }
  }
  for (const e of L.edges) {
    if (!showRho(e)) continue;
    for (let i = 1; i <= 6; i++) {
      const p = project(q({ x: e.a.x, y: e.a.y, z: e.a.z }, e.ctrl, { x: e.b.x, y: e.b.y, z: e.b.z }, i / 6));
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bd) { bd = d; best = { k: "edge", e }; }
    }
  }
  return best;
}

function meaning(st) {
  if (st === "ok") return "Legal trunk edge. Compose equals collapse.";
  if (st === "strange") return "Map exists but rank or sort is odd. Needs a person.";
  if (st === "missing") return "No restriction written. The sheaf cannot see this neighbor.";
  return "Coboundary will not go to zero. Do not fold.";
}

function lineOf(st) {
  if (st === "broken") return "won't fold";
  if (st === "missing") return "no map";
  if (st === "strange") return "needs a person";
  return "may fold";
}

function folderName(id) {
  const p = (graph.pillars || []).find((x) => x.id === id);
  return p ? p.folder : id;
}

function openIds(flipId) {
  const open = {};
  if (!graph) return open;
  (graph.pillars || []).forEach((p) => {
    const hit = (graph.restrictions || []).some(
      (r) => (r.source === p.id || r.target === p.id) && (r.status === "ok" || r.id === flipId),
    );
    if (hit) open[p.id] = 1;
  });
  return open;
}

function repairs() {
  if (!graph) return [];
  const rank = { broken: 0, missing: 1, strange: 2, ok: 3 };
  const before = openIds();
  return (graph.restrictions || [])
    .filter((r) => r.status !== "ok")
    .map((r) => {
      const after = openIds(r.id);
      const opens = (graph.pillars || []).filter((p) => !before[p.id] && after[p.id]).map((p) => p.folder);
      const closes = (graph.pillars || []).every((p) => after[p.id]);
      return {
        id: r.id,
        status: r.status,
        residual: r.residual,
        from: folderName(r.source),
        to: folderName(r.target),
        opens: opens,
        closes: closes,
      };
    })
    .sort((a, b) => {
      if (a.closes !== b.closes) return a.closes ? -1 : 1;
      if (a.opens.length !== b.opens.length) return b.opens.length - a.opens.length;
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || b.residual - a.residual;
    });
}

function closedNames(flipId) {
  const open = openIds(flipId);
  return (graph.pillars || []).filter((p) => !open[p.id]).map((p) => p.folder);
}

function verdictText() {
  if (!graph) return "";
  const fixes = repairs();
  const open = (graph.pillars || []).filter((p) => openIds()[p.id]).length;
  const n = (graph.pillars || []).length;
  if (!fixes.length) return "Every map commutes. " + open + " folders may fold.";
  const best = fixes[0];
  if (!best.opens.length) return open + " of " + n + " may fold. No single fix opens a new folder.";
  if (best.closes) return "Fix " + best.from + " → " + best.to + " and the trunk closes.";
  const still = n - open - best.opens.length;
  return "Fix " + best.from + " → " + best.to + " and " + best.opens.join(", ") + " may fold. " + still + " still closed.";
}

function rowText(r) {
  if (r.closes) return r.from + " → " + r.to + " · closes the trunk";
  if (r.opens.length) return r.from + " → " + r.to + " · opens " + r.opens.join(", ");
  return r.from + " → " + r.to + " · opens nothing";
}

function focusText(edge) {
  const meaning = edge.meaning || lineOf(edge.st);
  const list = repairs();
  let f = null;
  for (let i = 0; i < list.length; i++) if (list[i].id === edge.id) f = list[i];
  if (!f) return meaning;
  if (f.closes) return "This one map closes the trunk. " + meaning;
  if (f.opens.length) {
    const still = closedNames(edge.id);
    return "Opens " + f.opens.join(", ") + ". " + (still.length ? still.join(", ") + " still closed. " : "") + meaning;
  }
  const closed = closedNames();
  return "Opens no new folder. " + (closed.length ? closed.join(", ") + " still closed. " : "") + meaning;
}

function fixOf(id) {
  const list = repairs();
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

function panel(h) {
  const pt = document.getElementById("pt");
  const pm = document.getElementById("pm");
  const pa = document.getElementById("pa");
  const tb = document.getElementById("tb");
  const body = document.getElementById("tbody");
  if (!h) {
    const blocks = repairs();
    pt.textContent = "Look here";
    pm.textContent = BLURB[view];
    pa.textContent = verdictText();
    tb.hidden = !blocks.length;
    body.replaceChildren();
    blocks.slice(0, 6).forEach((r) => {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = rowText(r);
      btn.style.cssText = "border:0;background:transparent;padding:8px 0;min-height:44px;text-transform:none;letter-spacing:0;font:500 .78rem/1.3 var(--sans);text-align:left";
      btn.onclick = () => {
        const e = L.edges.find((x) => x.id === r.id);
        if (!e) return;
        pin = { k: "edge", e };
        panel(pin);
      };
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = SC[r.status];
      td.append(dot, btn);
      tr.append(td);
      body.append(tr);
    });
    return;
  }
  if (h.k === "edge") {
    const e = h.e;
    pt.textContent = (e.a.folder || e.s) + " → " + (e.b.folder || e.t);
    pm.textContent = e.rel + " · " + lineOf(e.st);
    pa.textContent = focusText(e);
    tb.hidden = true;
    return;
  }
  const n = h.n;
  pt.textContent = n.folder;
  const rows = (graph.restrictions || []).filter((r) => r.source === n.id || r.target === n.id);
  const worst = rows.slice().sort((a, b) => (a.status === "ok" ? 1 : 0) - (b.status === "ok" ? 1 : 0))[0];
  pm.textContent = worst ? lineOf(worst.status) : "no maps";
  pa.textContent = worst && worst.status !== "ok"
    ? focusText({ id: worst.id, st: worst.status, meaning: worst.residualMeaning })
    : (worst && worst.residualMeaning) || (h.k === "cap" ? "Ancillary files sit above this folder." : "Downstream events sit below this folder.");
  tb.hidden = !rows.length;
  body.replaceChildren();
  const fixes = repairs();
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    const other = r.source === n.id ? r.target : r.source;
    const name = folderName(other);
    let lever = "";
    for (let i = 0; i < fixes.length; i++) {
      if (fixes[i].id !== r.id) continue;
      if (fixes[i].closes) lever = " · closes the trunk";
      else if (fixes[i].opens.length) lever = " · opens " + fixes[i].opens.join(", ");
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = r.relation + " " + name + " · " + lineOf(r.status) + lever;
    btn.style.cssText = "border:0;background:transparent;padding:8px 0;min-height:44px;text-transform:none;letter-spacing:0;font:500 .78rem/1.3 var(--sans);text-align:left";
    btn.onclick = () => {
      const e = L.edges.find((x) => x.id === r.id);
      if (e) { pin = { k: "edge", e }; panel(pin); }
    };
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = SC[r.status];
    td.append(dot, btn);
    tr.append(td);
    body.append(tr);
  });
}

function stats() {
  if (!graph) return;
  const blocks = repairs();
  const open = (graph.pillars || []).filter((p) => openIds()[p.id]).length;
  document.getElementById("sn").textContent = (graph.restrictions || []).length;
  document.getElementById("sok").textContent = open;
  document.getElementById("sbad").textContent = blocks.length;
  document.getElementById("title").textContent = verdictText();
  document.getElementById("kicker").textContent = graph.title || graph.id;
}

function setView(name) {
  if (!VIEWS.includes(name)) return;
  view = name;
  [yaw, pitch] = CAM[name];
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === name)));
  document.querySelectorAll(".rail button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.view === name)));
  document.getElementById("chip").textContent = ASK[name];
  L = layout();
  panel(pin);
}

function applyGraph(g) {
  graph = g;
  pin = null;
  fan = null;
  stats();
  L = layout();
  panel(null);
  const sel = document.getElementById("contract");
  const hitC = catalog.find((c) => c.id === g.id);
  if (sel && hitC) sel.value = hitC.file;
}

function err(msg) {
  const el = document.getElementById("err");
  el.hidden = !msg;
  el.textContent = msg ? "roll refused · " + msg : "";
}

async function loadFile(file) {
  try {
    const g = JSON.parse(await fetch(CONTRACTS + file).then((r) => {
      if (!r.ok) throw new Error("missing " + file);
      return r.text();
    }));
    if (g.schema !== "sheaf-graph/2020-12") throw new Error("schema must be sheaf-graph/2020-12");
    if (!g.pillars || !g.restrictions) throw new Error("pillars and restrictions required");
    applyGraph(g);
    err("");
  } catch (e) {
    err(String(e.message || e));
  }
}

function resize() {
  const r = canvas.parentElement.getBoundingClientRect();
  const d = Math.min(devicePixelRatio || 1, 2);
  W = r.width;
  H = r.height;
  canvas.width = W * d;
  canvas.height = H * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
}

const ASK = { pillars: "Exists", rho: "Restricts", strata: "Stacks", harmonic: "Known", trunk: "May fold", subspaces: "Lives" };
VIEWS.forEach((v, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.view = v;
  b.textContent = ASK[v];
  b.setAttribute("aria-selected", String(i === 0));
  b.onclick = () => setView(v);
  document.getElementById("tabs").appendChild(b);
  const d = document.createElement("button");
  d.type = "button";
  d.dataset.view = v;
  d.title = v;
  d.setAttribute("aria-current", String(i === 0));
  d.onclick = () => setView(v);
  document.getElementById("rail").appendChild(d);
});

canvas.addEventListener("pointerdown", (e) => {
  drag = 1; moved = 0; sdx = 0; sdy = 0; lx = e.clientX; ly = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - lx, dy = e.clientY - ly;
  moved += Math.hypot(dx, dy);
  sdx += dx;
  sdy += dy;
  if (Math.abs(sdx) >= Math.abs(sdy) || !coarse) {
    yaw += dx * 0.005;
    pitch = Math.max(-0.15, Math.min(1.15, pitch + dy * 0.004));
  }
  lx = e.clientX;
  ly = e.clientY;
});
canvas.addEventListener("pointerup", (e) => {
  const vert = Math.abs(sdy) > 56 && Math.abs(sdy) > Math.abs(sdx) * 1.35;
  if (vert) {
    const i = VIEWS.indexOf(view);
    setView(VIEWS[Math.max(0, Math.min(VIEWS.length - 1, i + (sdy < 0 ? 1 : -1)))]);
  } else if (moved < 12) {
    const r = canvas.getBoundingClientRect();
    pin = hit(e.clientX - r.left, e.clientY - r.top);
    if (pin && pin.k === "cap" && pin.n.role === "core") { fan = pin.n.id; fanDir = "up"; L = layout(); }
    if (pin && pin.k === "base" && pin.n.role === "core") { fan = pin.n.id; fanDir = "down"; L = layout(); }
    panel(pin);
  }
  drag = 0;
});

document.getElementById("pause").onclick = () => {
  paused = !paused;
  document.getElementById("pause").setAttribute("aria-pressed", String(paused));
  document.getElementById("pause").textContent = paused ? "Pause" : "Play";
};
document.getElementById("up").onclick = () => { fan = fan || (graph && graph.pillars[0].id); fanDir = "up"; L = layout(); };
document.getElementById("dn").onclick = () => { fan = fan || (graph && graph.pillars[0].id); fanDir = "down"; L = layout(); };

var shY = 0, shD = 0;
document.getElementById("sheet").addEventListener("pointerdown", (e) => { shY = e.clientY; shD = 0; });
document.getElementById("sheet").addEventListener("pointermove", (e) => { if (shY) shD = e.clientY - shY; });
document.getElementById("sheet").addEventListener("pointerup", () => { if (shD > 48) { pin = null; panel(null); } shY = 0; });

addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") setView(VIEWS[Math.min(5, VIEWS.indexOf(view) + 1)]);
  if (e.key === "ArrowLeft") setView(VIEWS[Math.max(0, VIEWS.indexOf(view) - 1)]);
  if (e.key === " ") { e.preventDefault(); document.getElementById("pause").click(); }
});
addEventListener("resize", resize);
resize();

document.getElementById("roll").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  file.text().then((t) => {
    try { applyGraph(JSON.parse(t)); err(""); }
    catch (ex) { err("file is not JSON"); }
  });
});

(function loop() {
  if (!paused && !drag && !reduce) yaw += 0.0009;
  paint();
  requestAnimationFrame(loop);
})();

fetch(CONTRACTS + "catalog.json")
  .then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((cat) => {
    catalog = cat.contracts || [];
    const sel = document.getElementById("contract");
    sel.innerHTML = "";
    catalog.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.file;
      o.textContent = c.id;
      sel.appendChild(o);
    });
    sel.onchange = () => loadFile(sel.value);
    const first = catalog.find((c) => c.role === "specimen") || catalog[0];
    return loadFile(first ? first.file : "swarm.sheaf.json");
  })
  .catch(() => loadFile("swarm.sheaf.json"));
