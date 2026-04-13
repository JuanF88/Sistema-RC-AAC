"use client";

import { useMemo, useState } from "react";

import type { ConsolidadoDashboard } from "@/lib/consolidado";

type Props = {
  data: ConsolidadoDashboard;
};

type ViewMode = "consolidado" | "facultades" | "detalle";

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
    neutral: "bg-blue-100 text-blue-800 border-blue-300",
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
  const [view, setView] = useState<ViewMode>("consolidado");
  const [menuOpen, setMenuOpen] = useState(true);
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

  const menuItems: Array<{ id: ViewMode; label: string; subtitle: string }> = [
    { id: "consolidado", label: "Consolidado", subtitle: "Matriz general" },
    { id: "facultades", label: "Facultades", subtitle: "Vista agregada" },
    { id: "detalle", label: "Programa", subtitle: "Ficha especifica" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,#1f4fa9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#36a2eb_0%,transparent_30%),linear-gradient(180deg,#f5faff_0%,#eaf3ff_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(13,52,124,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(13,52,124,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />

      <div className="relative flex min-h-screen">
        <aside
          className={`z-20 shrink-0 border-r border-blue-900/15 bg-[linear-gradient(180deg,#0b2d73_0%,#133f93_100%)] text-blue-50 shadow-xl transition-all duration-300 ${
            menuOpen ? "w-72" : "w-20"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4">
            {menuOpen && <p className="text-sm font-bold tracking-widest text-blue-100">SIAC UNICAUCA</p>}
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-lg border border-blue-300/20 bg-blue-900/30 p-2 hover:bg-blue-800/40"
              aria-label="Abrir o cerrar menu"
            >
              <div className="flex w-4 flex-col gap-1">
                <span className="h-0.5 w-4 bg-blue-100" />
                <span className="h-0.5 w-4 bg-blue-100" />
                <span className="h-0.5 w-4 bg-blue-100" />
              </div>
            </button>
          </div>

          <nav className="px-3 pb-3 pt-2">
            {menuItems.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`mb-2 flex w-full items-center rounded-xl px-3 py-3 text-left transition ${
                    active ? "bg-white text-blue-900" : "text-blue-100 hover:bg-blue-800/50"
                  }`}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-200/20 text-xs font-bold">
                    {item.label.slice(0, 1)}
                  </span>
                  {menuOpen && (
                    <span className="ml-3">
                      <span className="block text-sm font-bold">{item.label}</span>
                      <span className={`block text-xs ${active ? "text-blue-700" : "text-blue-200"}`}>{item.subtitle}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex w-full min-w-0 flex-col gap-5 p-3 sm:p-5 lg:p-7">
          <section className="animate-[fadeIn_500ms_ease-out] rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-[0_24px_80px_-40px_rgba(5,55,110,0.55)] backdrop-blur md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-700">Universidad del Cauca</p>
            <h1 className="mt-2 max-w-4xl text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Consolidado de Registro Calificado y Acreditacion
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-700 sm:text-base">
              Interfaz pensada para analisis: menu lateral para vistas, matriz amplia para navegar mas datos y panel detallado
              por programa.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Fuente activa: <strong>{data.source.toUpperCase()}</strong> · Actualizado {formatDate(data.generatedAt)}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                className="animate-[riseIn_450ms_ease-out] rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{label}</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-black text-slate-900">
                {view === "consolidado" ? "Matriz Consolidado" : view === "facultades" ? "Vista por Facultades" : "Detalle de Programa"}
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="rounded-xl border border-blue-200 bg-blue-50/40 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Buscar por programa, codigo o SNIES"
                />
                <select
                  value={faculty}
                  onChange={(event) => setFaculty(event.target.value)}
                  className="rounded-xl border border-blue-200 bg-blue-50/40 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  {faculties.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {view === "consolidado" && (
              <div className="overflow-hidden rounded-2xl border border-blue-100">
                <div className="max-h-[65vh] overflow-auto">
                  <table className="min-w-[1450px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-blue-900 text-blue-50">
                      <tr>
                        {[
                          "Codigo",
                          "SNIES",
                          "Facultad",
                          "Programa",
                          "Nivel",
                          "Modalidad",
                          "Inicio RC",
                          "Vencimiento RC",
                          "RRC MinEdu",
                          "Acreditable",
                          "Acreditado",
                          "Proceso AAC",
                          "Inicio AAC",
                          "Vencimiento AAC",
                        ].map((header) => (
                          <th key={header} className="whitespace-nowrap border-b border-blue-700 px-3 py-3 text-left text-xs uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((program) => (
                        <tr
                          key={program.id}
                          onClick={() => {
                            setSelectedId(program.id);
                            setView("detalle");
                          }}
                          className="cursor-pointer odd:bg-white even:bg-blue-50/30 hover:bg-blue-100/50"
                        >
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 font-semibold text-slate-800">{program.processCode}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-600">{program.snies || "N/D"}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-700">{program.faculty}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 font-semibold text-slate-900">{program.program}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-700">{program.level || "-"}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-700">{program.modality || "-"}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-700">{formatDate(program.rcStart)}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-700">{formatDate(program.rcEnd)}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-700">{formatDate(program.rrcMineducacion)}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2">{program.acreditable ? "Si" : "No"}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2">{program.accredited ? "Si" : "No"}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2">{program.inAccreditationProcess ? "Si" : "No"}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-700">{formatDate(program.aacStart)}</td>
                          <td className="whitespace-nowrap border-b border-blue-50 px-3 py-2 text-slate-700">{formatDate(program.aacEnd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && <p className="p-6 text-sm text-slate-500">No hay programas para ese filtro.</p>}
              </div>
            )}

            {view === "facultades" && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.byFaculty.map((row) => (
                  <article key={row.faculty} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                    <h3 className="text-base font-extrabold text-slate-900">{row.faculty}</h3>
                    <p className="mt-2 text-sm text-slate-700">Programas: {row.programs}</p>
                    <p className="text-sm text-slate-700">RC vigentes: {row.activeRc}</p>
                    <p className="text-sm text-slate-700">Acreditados: {row.accredited}</p>
                  </article>
                ))}
              </div>
            )}

            {view === "detalle" && (
              <article className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
                {selected ? (
                  <>
                    <h3 className="text-2xl font-black text-slate-900">{selected.program}</h3>
                    <p className="mt-1 text-sm text-slate-700">
                      {selected.faculty} · {selected.degree || "Sin titulo"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {statusChip(selected.hasCurrentRc ? "RC vigente" : "RC vencido", selected.hasCurrentRc ? "ok" : "warn")}
                      {statusChip(selected.acreditable ? "Acreditable" : "No acreditable", "neutral")}
                      {statusChip(selected.accredited ? "Acreditado" : "No acreditado", selected.accredited ? "ok" : "warn")}
                    </div>

                    <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="font-semibold text-slate-500">Codigo proceso</dt>
                        <dd className="font-bold text-slate-800">{selected.processCode || "Sin dato"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">SNIES</dt>
                        <dd className="font-bold text-slate-800">{selected.snies || "Sin dato"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Inicio RC</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.rcStart)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Vencimiento RC</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.rcEnd)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Entrega CGCAI</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.rrcSiga)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Plazo MinEducacion</dt>
                        <dd className="font-bold text-slate-800">{formatDate(selected.rrcMineducacion)}</dd>
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
                        <dt className="font-semibold text-slate-500">Lugar</dt>
                        <dd className="font-bold text-slate-800">{selected.location || "Sin dato"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Nivel</dt>
                        <dd className="font-bold text-slate-800">{selected.level || "Sin dato"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-slate-500">Modalidad</dt>
                        <dd className="font-bold text-slate-800">{selected.modality || "Sin dato"}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Selecciona un programa desde la matriz.</p>
                )}
              </article>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
