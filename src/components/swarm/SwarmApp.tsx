import { useEffect, useRef } from "react";
import { CATALOG, VIEW_BLURB, VIEW_LABEL } from "@/lib/swarm/specimen";
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
  const commits = useSwarm((s) => s.commits);
  const operad = useSwarm((s) => s.operad);
  const graph = useSwarm((s) => s.graph);
  const sheetOpen = useSwarm((s) => s.sheetOpen);
  const setSheet = useSwarm((s) => s.setSheet);
  const findings = graph.findings ?? [];
  const restrictions = graph.restrictions;
  const pillars = graph.pillars;

  const pillar = pillars.find((p) => p.id === selected);
  const agent = agents.find((a) => a.id === selected);
  const node = operad.find((n) => n.id === selected);

  let title = VIEW_LABEL[mode];
  let meta = "swipe ↕ modes · tap a pillar · gold is earned";
  let body = VIEW_BLURB[mode];
  let rows: { label: string; status: GlueStatus }[] = [];

  if (pillar) {
    title = pillar.folder;
    meta = `${pillar.kind} · dim ${pillar.dim} · ${commits.filter((c) => c.pillar === pillar.id).length} commits`;
    body = "Cap is last-folder. Restriction color is glue. Agents that live here launch along ρ.";
    rows = restrictions
      .filter((r) => r.source === pillar.id || r.target === pillar.id)
      .map((r) => ({
        label: `${r.relation} ${r.source === pillar.id ? r.target : r.source}${r.residualMeaning ? " — " + r.residualMeaning : ""}`,
        status: r.status,
      }));
  } else if (agent) {
    title = `${agent.role}  ·  ${agent.id}`;
    meta = `${agent.state} · lives-at ${agent.livesAt} · ${agent.edgeId ?? "no ρ"}`;
    body = agent.task;
  } else if (node) {
    title = node.sort;
    meta = `OC ${node.oc}`;
    body = `${node.question} — ${node.prompt}`;
  } else if (mode === "eval") {
    title = "Adversarial seats";
    meta = `${findings.length} findings · kernel is ρ must be drawn`;
    body = findings[0]?.claim ?? body;
    rows = findings.map((f) => ({
      label: `${f.seat} ${f.id} ${f.claim}`,
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
        <ul className="mt-3 space-y-1.5">
          {rows.slice(0, 8).map((r) => (
            <li key={r.label} className="flex items-start gap-2 font-mono text-[0.68rem]">
              <span className={`mt-1 inline-block size-2 shrink-0 rounded-full ${STATUS[r.status]}`} />
              <span>{r.label}</span>
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
  const tick = useSwarm((s) => s.tick);
  const jevDone = useSwarm((s) => s.jevDone);
  const agents = useSwarm((s) => s.agents);
  const commits = useSwarm((s) => s.commits);
  const graph = useSwarm((s) => s.graph);
  const loadError = useSwarm((s) => s.loadError);
  const restrictions = graph.restrictions;
  const inflight = agents.filter((a) => a.state === "inflight").length;
  const okRho = restrictions.filter((r) => r.status === "ok").length;
  const hurt = restrictions.filter((r) => r.status !== "ok").length;

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
          <p className="font-serif text-[0.86rem] text-ink/70 italic">
            {graph.id} · sheaf-graph/2020-12 · ρ is the color
          </p>
          <h1 className="font-serif text-[1.18rem] font-semibold tracking-tight">
            {graph.title ?? "Cell-Sheaf Swarm"}
          </h1>
        </div>
        <div className="flex gap-3 font-mono text-[0.64rem] tabular-nums">
          <div>
            live<b className="text-ube mt-0.5 block text-[0.9rem]">{inflight}</b>
          </div>
          <div>
            JEV<b className="text-ube mt-0.5 block text-[0.9rem]">{jevDone}/128</b>
          </div>
          <div>
            commits<b className="text-ube mt-0.5 block text-[0.9rem]">{commits.length}</b>
          </div>
          <div>
            ok ρ<b className="text-ube mt-0.5 block text-[0.9rem]">{okRho}</b>
          </div>
          <div>
            hurt<b className="text-ube mt-0.5 block text-[0.9rem]">{hurt}</b>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Contracts />
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
          {MODES_LIST.indexOf(mode) + 1} · {mode} · tick {tick}
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
          <span className="inline-flex items-center gap-1.5"><i className="bg-ok inline-block size-2 rounded-full" />ρ consistent</span>
          <span className="inline-flex items-center gap-1.5"><i className="bg-odd inline-block size-2 rounded-full" />strange</span>
          <span className="inline-flex items-center gap-1.5"><i className="bg-bad inline-block size-2 rounded-full" />broken</span>
          <span className="inline-flex items-center gap-1.5"><i className="bg-gold inline-block size-2 rounded-full" />trunk commit</span>
          <span className="inline-flex items-center gap-1.5"><i className="bg-pulse inline-block size-2 rounded-full" />in flight</span>
        </div>
        <span>contract · export · roll a *.sheaf.json · gold is earned</span>
      </footer>
    </div>
  );
}
