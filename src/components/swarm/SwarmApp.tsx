import { useEffect, useRef } from "react";
import { CATALOG, VIEW_BLURB, VIEW_LABEL } from "@/lib/swarm/specimen";
import { blockers, focusLine, openCount, repairs, repairLabel, statusLine, verdict } from "@/lib/swarm/insight";
import { MODES_LIST, useSwarm } from "@/lib/swarm/store";
import type { GlueStatus } from "@/lib/swarm/types";
import { VolumeCanvas } from "./VolumeCanvas";

const STATUS: Record<GlueStatus, string> = {
  ok: "bg-ok",
  strange: "bg-odd",
  broken: "bg-bad",
  missing: "bg-miss",
};

function Clock() {
  const pulse = useSwarm((s) => s.pulse);
  const paused = useSwarm((s) => s.paused);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(pulse, 420);
    return () => clearInterval(id);
  }, [paused, pulse]);
  return null;
}

function Inspector() {
  const selected = useSwarm((s) => s.selected);
  const mode = useSwarm((s) => s.mode);
  const agents = useSwarm((s) => s.agents);
  const operad = useSwarm((s) => s.operad);
  const graph = useSwarm((s) => s.graph);
  const sheetOpen = useSwarm((s) => s.sheetOpen);
  const setSheet = useSwarm((s) => s.setSheet);
  const lookAt = useSwarm((s) => s.lookAt);
  const focusEdge = useSwarm((s) => s.focusEdge);
  const findings = graph.findings ?? [];
  const restrictions = graph.restrictions;
  const pillars = graph.pillars;
  const fixes = repairs(graph);

  const pillar = pillars.find((p) => p.id === selected);
  const agent = agents.find((a) => a.id === selected);
  const node = operad.find((n) => n.id === selected);
  const focused = restrictions.find((r) => r.id === focusEdge);

  let title = "Look here";
  let meta = VIEW_BLURB[mode];
  let body = verdict(graph);
  let rows: { id: string; label: string; status: GlueStatus }[] = fixes.slice(0, 6).map((b) => ({
    id: b.id,
    label: repairLabel(b),
    status: b.status,
  }));

  if (focused) {
    const from = pillars.find((p) => p.id === focused.source)?.folder ?? focused.source;
    const to = pillars.find((p) => p.id === focused.target)?.folder ?? focused.target;
    title = `${from} → ${to}`;
    meta = `${focused.relation} · ${statusLine(focused.status)}`;
    body = focusLine(graph, focused.id);
    rows = [];
  } else if (pillar) {
    const incident = restrictions.filter((r) => r.source === pillar.id || r.target === pillar.id);
    const byId = new Map(fixes.map((f) => [f.id, f]));
    const worst = [...incident].sort((a, b) => (a.status === "ok" ? 1 : 0) - (b.status === "ok" ? 1 : 0))[0];
    title = pillar.folder;
    meta = worst ? statusLine(worst.status) : "no maps";
    body =
      worst && worst.status !== "ok"
        ? focusLine(graph, worst.id)
        : worst?.residualMeaning || (worst?.status === "ok" ? "Every map on this folder may fold." : "No map touches this folder.");
    rows = incident.map((r) => {
      const f = byId.get(r.id);
      const lever = f?.closesTrunk ? " · closes the trunk" : f?.opens.length ? ` · opens ${f.opens.join(", ")}` : "";
      const other = r.source === pillar.id ? pillars.find((p) => p.id === r.target)?.folder : pillars.find((p) => p.id === r.source)?.folder;
      return {
        id: r.id,
        label: `${r.relation} ${other} · ${statusLine(r.status)}${lever}`,
        status: r.status,
      };
    });
  } else if (agent) {
    title = agent.role;
    meta = `${agent.state} · ${pillars.find((p) => p.id === agent.livesAt)?.folder ?? agent.livesAt}`;
    body = agent.task;
    rows = [];
  } else if (node) {
    title = node.sort;
    meta = node.oc === "agree" ? "parts match the whole" : node.oc === "diverge" ? "parts do not match" : "not checked";
    body = node.question;
    rows = [];
  } else if (mode === "eval" && findings.length) {
    title = "What cannot be kept";
    meta = VIEW_BLURB.eval;
    body = findings.find((f) => f.sev === "P0")?.claim ?? findings[0].claim;
    rows = findings.map((f) => ({
      id: f.id,
      label: `${f.claim}`,
      status: f.sev === "P0" ? "broken" : "strange",
    }));
  }

  return (
    <aside
      className={
        "border-ink/20 bg-paper/90 absolute z-20 overflow-auto border p-3 " +
        "top-3 right-3 max-h-[calc(100%-1.5rem)] w-[min(320px,92vw)] " +
        "max-md:top-auto max-md:right-2 max-md:bottom-0 max-md:left-2 max-md:max-h-[38vh] max-md:w-auto max-md:rounded-t-xl max-md:border-b-0 " +
        (sheetOpen ? "max-md:translate-y-0" : "max-md:translate-y-[calc(100%-3.25rem)]")
      }
    >
      <button
        type="button"
        className="bg-ink/25 mx-auto mb-2 hidden h-1 w-10 rounded-full max-md:block"
        aria-label="Dismiss inspector"
        onClick={() => setSheet(false)}
      />
      <h2 className="font-serif text-[1.02rem] font-semibold text-balance">{title}</h2>
      <p className="text-ink/70 mt-1 font-mono text-[0.64rem] leading-snug">{meta}</p>
      <p className="mt-2 text-[0.82rem] leading-snug text-pretty">{body}</p>
      {rows.length > 0 && (
        <ul className="mt-3 space-y-1">
          {rows.slice(0, 6).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => lookAt(r.id)}
                className="flex min-h-11 w-full items-center gap-2 text-left text-[0.78rem] leading-snug"
              >
                <span className={`inline-block size-2 shrink-0 rounded-full ${STATUS[r.status]}`} />
                <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function Feed() {
  const events = useSwarm((s) => s.events);
  return (
    <ol className="pointer-events-none absolute bottom-3 left-3 z-10 hidden max-h-40 w-64 overflow-hidden md:block">
      {events.slice(0, 6).map((e) => (
        <li key={e.id} className="text-ink/75 truncate font-mono text-[0.62rem] leading-relaxed">
          <span className="text-ube uppercase">{e.kind}</span> {e.text}
        </li>
      ))}
    </ol>
  );
}

function Contracts() {
  const graph = useSwarm((s) => s.graph);
  const loadCatalog = useSwarm((s) => s.loadCatalog);
  const loadGraph = useSwarm((s) => s.loadGraph);
  const exportGraph = useSwarm((s) => s.exportGraph);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="sr-only" htmlFor="sheaf-contract">
        Sheaf contract
      </label>
      <select
        id="sheaf-contract"
        value={CATALOG.some((g) => g.id === graph.id) ? graph.id : ""}
        onChange={(e) => loadCatalog(e.target.value)}
        className="border-ink bg-paper text-ink min-h-11 max-w-[11rem] border px-2 text-[0.66rem] font-semibold tracking-wide uppercase"
      >
        {!CATALOG.some((g) => g.id === graph.id) && (
          <option value="">{graph.id}</option>
        )}
        {CATALOG.map((g) => (
          <option key={g.id} value={g.id}>
            {g.id}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={exportGraph}
        className="border-ink min-h-11 border px-3 text-[0.66rem] font-semibold tracking-widest uppercase"
      >
        Export
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="border-ink min-h-11 border px-3 text-[0.66rem] font-semibold tracking-widest uppercase"
      >
        Roll
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json,.sheaf.json"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          file.text().then((text) => {
            try {
              loadGraph(JSON.parse(text), `rolled ${file.name}`);
            } catch {
              useSwarm.setState({ loadError: "file is not JSON" });
            }
          });
        }}
      />
    </div>
  );
}

export function SwarmApp() {
  const mode = useSwarm((s) => s.mode);
  const setMode = useSwarm((s) => s.setMode);
  const paused = useSwarm((s) => s.paused);
  const togglePause = useSwarm((s) => s.togglePause);
  const agents = useSwarm((s) => s.agents);
  const graph = useSwarm((s) => s.graph);
  const loadError = useSwarm((s) => s.loadError);
  const blocks = blockers(graph);
  const open = openCount(graph);
  const line = verdict(graph);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        togglePause();
      }
      if (e.key === "ArrowRight") useSwarm.getState().stepMode(1);
      if (e.key === "ArrowLeft") useSwarm.getState().stepMode(-1);
      if (e.key === "Escape") useSwarm.getState().select(null);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [togglePause]);

  return (
    <div className="bg-paper text-ink flex h-dvh flex-col">
      <Clock />
      <header className="border-ink/15 flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4">
        <div>
          <p className="font-serif text-[0.78rem] text-ink/60 italic">{graph.title ?? graph.id}</p>
          <h1 className="font-serif max-w-[40rem] text-[1.02rem] leading-snug font-semibold text-balance">
            {line}
          </h1>
        </div>
        <div className="flex gap-3 font-mono text-[0.64rem] tabular-nums">
          <div>
            open<b className="text-ok mt-0.5 block text-[0.9rem]">{open}</b>
          </div>
          <div>
            blocks<b className={`mt-0.5 block text-[0.9rem] ${blocks.length ? "text-bad" : "text-ok"}`}>{blocks.length}</b>
          </div>
          <div>
            live<b className="text-ube mt-0.5 block text-[0.9rem]">{agents.filter((a) => a.state === "inflight").length}</b>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Contracts />
          <a
            href="/template.html"
            title="HTML design template — copy this chrome, swap the sheaf"
            className="border-ink inline-flex min-h-11 items-center border px-3 text-[0.66rem] font-semibold tracking-widest uppercase"
          >
            Design
          </a>
          <button
            type="button"
            aria-pressed={paused}
            onClick={togglePause}
            className="border-ink min-h-11 border px-3 text-[0.66rem] font-semibold tracking-widest uppercase aria-pressed:bg-ok aria-pressed:text-paper"
          >
            {paused ? "Paused" : "Live"}
          </button>
        </div>
      </header>
      {loadError && (
        <p className="bg-bad text-paper px-3 py-1.5 font-mono text-[0.68rem]" role="alert">
          roll refused · {loadError}
        </p>
      )}
      <nav className="border-ink/10 flex gap-1.5 overflow-x-auto border-b px-2 py-1.5" role="tablist" aria-label="Views">
        {MODES_LIST.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className="border-ink min-h-11 shrink-0 border px-3 text-[0.66rem] font-semibold tracking-widest uppercase aria-selected:bg-ube aria-selected:text-gold"
          >
            {VIEW_LABEL[m]}
          </button>
        ))}
      </nav>
      <div className="relative min-h-0 flex-1">
        <VolumeCanvas />
        <div className="border-ink/20 bg-paper/85 pointer-events-none absolute top-2.5 left-3 z-10 border px-2 py-1.5 text-[0.62rem] font-semibold tracking-widest uppercase">
          {MODES_LIST.indexOf(mode) + 1} · {VIEW_LABEL[mode]}
        </div>
        <div className="absolute top-1/2 right-2 z-10 hidden -translate-y-1/2 flex-col items-center gap-2.5 max-md:flex">
          {MODES_LIST.map((m) => (
            <button
              key={m}
              type="button"
              aria-current={mode === m}
              title={VIEW_LABEL[m]}
              onClick={() => setMode(m)}
              className="border-ink size-3.5 rounded-full border aria-current:bg-ube aria-current:border-ube"
            />
          ))}
        </div>
        <Inspector />
        <Feed />
      </div>
      <footer className="border-ink/15 hidden items-center justify-between gap-3 border-t px-4 py-2 text-[0.7rem] text-ink/75 sm:flex">
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5"><i className="bg-ok inline-block size-2 rounded-full" />may fold</span>
          <span className="inline-flex items-center gap-1.5"><i className="bg-odd inline-block size-2 rounded-full" />needs a person</span>
          <span className="inline-flex items-center gap-1.5"><i className="bg-bad inline-block size-2 rounded-full" />won't fold</span>
          <span className="inline-flex items-center gap-1.5"><i className="bg-miss inline-block size-2 rounded-full" />no map</span>
          <span className="inline-flex items-center gap-1.5"><i className="bg-gold inline-block size-2 rounded-full" />earned</span>
        </div>
        <span>look here · tap a red or orange curve · gold is earned</span>
      </footer>
    </div>
  );
}
