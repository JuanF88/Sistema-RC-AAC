"use client";

import { useMemo, useState } from "react";

import type { ConsolidadoDashboard } from "@/lib/consolidado";

type Props = {
  data: ConsolidadoDashboard;
};

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusChip(label: string, tone: "ok" | "warn" | "neutral") {
  const styles = {
    ok: "bg-emerald-100 text-emerald-800 border-emerald-300",
    warn: "bg-amber-100 text-amber-900 border-amber-300",
    neutral: "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}>
      {label}
    </span>
  );
}

export function ConsolidadoDashboardClient({ data }: Props) {
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("Todas");
  const [selectedId, setSelectedId] = useState<string | null>(data.programs[0]?.id ?? null);

  const faculties = useMemo(() => {
    return ["Todas", ...new Set(data.programs.map((program) => program.faculty))];
  }, [data.programs]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.programs.filter((program) => {
      const byFaculty = faculty === "Todas" || program.faculty === faculty;
      if (!byFaculty) return false;
      if (!query) return true;

      const corpus = `${program.program} ${program.processCode} ${program.snies} ${program.faculty}`.toLowerCase();
      return corpus.includes(query);
    });
  }, [data.programs, faculty, search]);

  const selected = filtered.find((program) => program.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#f9d18f_0%,transparent_35%),radial-gradient(circle_at_80%_90%,#9ed7ff_0%,transparent_35%),linear-gradient(180deg,#fefdf8_0%,#f3f8ff_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(20,40,80,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(20,40,80,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-10">
        <section className="animate-[fadeIn_500ms_ease-out] rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_24px_80px_-40px_rgba(5,55,110,0.55)] backdrop-blur md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">Universidad del Cauca</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Consolidado de Registro Calificado y Acreditacion
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-700 sm:text-base">
            Vista general y detalle por programa con logica de vencimientos, alertas RRC y seguimiento AAC.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Fuente activa: <strong>{data.source.toUpperCase()}</strong> · Actualizado {formatDate(data.generatedAt)}
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Programas", data.summary.totalPrograms],
            ["Facultades", data.summary.faculties],
            ["RC vigente", data.summary.activeRc],
            ["RC vencido", data.summary.expiredRc],
            ["Acreditados", data.summary.accredited],
            ["Alertas 120 dias", data.summary.upcomingRrcIn120Days],
          ].map(([label, value], idx) => (
            <article
              key={String(label)}
              className="animate-[riseIn_450ms_ease-out] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_1.6fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">Vista general por facultad</h2>
            <div className="mt-4 space-y-3">
              {data.byFaculty.map((row) => (
                <div key={row.faculty} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-bold text-slate-800">{row.faculty}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {row.programs} programas · {row.activeRc} RC vigentes · {row.accredited} acreditados
                  </p>
                </div>
              ))}
            </div>
          </aside>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">Vista especifica por programa</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:bg-white"
                  placeholder="Buscar por programa, codigo o SNIES"
                />
                <select
                  value={faculty}
                  onChange={(event) => setFaculty(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:bg-white"
                >
                  {faculties.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-100">
                {filtered.map((program) => (
                  <button
                    key={program.id}
                    type="button"
                    onClick={() => setSelectedId(program.id)}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-0 ${
                      selected?.id === program.id ? "bg-sky-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900">{program.program}</p>
                    <p className="text-xs text-slate-600">
                      {program.faculty} · Proceso {program.processCode} · SNIES {program.snies || "N/D"}
                    </p>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-4 py-6 text-sm text-slate-500">No hay programas para ese filtro.</p>
                )}
              </div>

              <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                {selected ? (
                  <>
                    <h3 className="text-xl font-black text-slate-900">{selected.program}</h3>
                    <p className="mt-1 text-sm text-slate-700">
                      {selected.faculty} · {selected.degree || "Sin titulo"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {statusChip(selected.hasCurrentRc ? "RC vigente" : "RC vencido", selected.hasCurrentRc ? "ok" : "warn")}
                      {statusChip(selected.acreditable ? "Acreditable" : "No acreditable", "neutral")}
                      {statusChip(selected.accredited ? "Acreditado" : "No acreditado", selected.accredited ? "ok" : "warn")}
                    </div>

                    <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-slate-500">Inicio RC</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.rcStart)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Vencimiento RC</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.rcEnd)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Plazo RRC (MinEducacion)</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.rrcMineducacion)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Entrega CGCAI</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.rrcSiga)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Inicio AAC</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.aacStart)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Vencimiento AAC</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.aacEnd)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Mitad vigencia AAC</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.improvementHalfway)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Lugar / Modalidad</dt>
                        <dd className="font-bold text-slate-800">
                          {[selected.location, selected.modality].filter(Boolean).join(" · ") || "Sin dato"}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Selecciona un programa para ver el detalle.</p>
                )}
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
