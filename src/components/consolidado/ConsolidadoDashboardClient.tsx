"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import type { ConsolidadoDashboard } from "@/lib/consolidado";

import { FiltersBar } from "./common/FiltersBar";
import { FACULTY_OPTIONS } from "./constants";
import { DashboardHeader } from "./layout/DashboardHeader";
import { SidebarMenu } from "./layout/SidebarMenu";
import styles from "./styles/DashboardShell.module.css";
import type { AcreditacionGroupingMode, EstadisticasSubTab, MenuItem, ProgramDocument, ProgramRecord, RegistroCalificadoGroupingMode, UserRole, ViewMode } from "./types";
import { ConsolidadoMatrixView } from "./views/ConsolidadoMatrixView";
import { ExpirationAlertsView } from "./views/ExpirationAlertsView";
import { ProgramEditModal } from "./views/ProgramEditModal";
import { RegistroCalificadoView } from "./views/RegistroCalificadoView";
import { AcreditacionProgramasView } from "./views/AcreditacionProgramasView";
import { VisitasParesView } from "./views/VisitasParesView";
import { EstadisticasView } from "./views/EstadisticasView";
import { UsersManagementView } from "./views/UsersManagementView";
import { ExportButton } from "./widgets/ExportButton";
import { KpiGrid } from "./widgets/KpiGrid";

type Props = {
  data: ConsolidadoDashboard;
  currentUser: string;
  currentRole: UserRole;
};

const MENU_ITEMS: MenuItem[] = [
  { id: "consolidado", label: "Consolidado", subtitle: "Matriz editable" },
  { id: "alertas", label: "Alertas", subtitle: "Vencimientos RRC/AAC" },
  { id: "registro-calificado", label: "Registro Calificado", subtitle: "Reporte por nivel" },
  { id: "acreditacion-programas", label: "Acreditacion de Programas", subtitle: "Programas acreditados" },
  { id: "visitas-pares", label: "Visitas de Pares", subtitle: "Seguimiento de visitas" },
  { id: "estadisticas", label: "Estadísticas", subtitle: "Análisis y gráficos" },
];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapProgramToApiPayload(program: ProgramRecord) {
  return program;
}

function createEmptyProgramDraft(): ProgramRecord {
  return {
    id: crypto.randomUUID(),
    documentCount: 0,
    processCode: "",
    faculty: "",
    program: "",
    degree: null,
    snies: null,
    creationAgreement: null,
    noRenewal: null,
    authorizedAdmissionsMen: null,
    admissionPeriodicity: null,
    agreementCode: null,
    agreementIes: null,
    agreementAdministrator: null,
    location: null,
    workday: null,
    regionalized: false,
    level: null,
    academicLevel: null,
    modality: null,
    methodology: null,
    researchCredits: null,
    deepeningCredits: null,
    totalAcademicCredits: null,
    duration: null,
    reformAcademicCouncil: null,
    reformSuperiorCouncil: null,
    reformMineducacion: null,
    ticPercentage: null,
    hasCurrentRc: null,
    rcResolution: null,
    rcStart: null,
    rcDurationYears: null,
    rcSiga: null,
    rcMineducacion: null,
    rcEnd: null,
    rcExtensionDecree1330: null,
    rcExtensionDecree1174: null,
    rcHistoricalResolutions: null,
    rcResolutionCount: null,
    rcOfficialResolution: null,
    rcDeniedResolution: null,
    numberGraduates: null,
    acreditable: false,
    accredited: false,
    inAccreditationProcess: false,
    aacResolution: null,
    aacStart: null,
    aacDurationYears: null,
    aacCgcaiDelivery: null,
    aacMineducacionFiling: null,
    aacEnd: null,
    aacImprovementHalfway: null,
    aacHistoricalResolutions: null,
    aacResolutionCount: null,
    aacDeniedResolution: null,
    accreditationGuideline: null,
    generalObservations: null,
    programCoordinator: null,
    source: "supabase",
  };
}

export function ConsolidadoDashboardClient({ data, currentUser, currentRole }: Props) {
  const [programs, setPrograms] = useState<ProgramRecord[]>(data.programs);
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("Todas");
  const [modality, setModality] = useState("Todas");
  const [level, setLevel] = useState("Todos");
  const [acreditableFilter, setAcreditableFilter] = useState("Todos");
  const [accreditedFilter, setAccreditedFilter] = useState("Todos");
  const [rcState, setRcState] = useState("Todos");
  const [registryGrouping, setRegistryGrouping] = useState<RegistroCalificadoGroupingMode>("programas");
  const [acreditacionGrouping, setAcreditacionGrouping] = useState<AcreditacionGroupingMode>("programas");
  const [estadisticasSubTab, setEstadisticasSubTab] = useState<EstadisticasSubTab>("generales");
  const [view, setView] = useState<ViewMode>("consolidado");
  const [menuOpen, setMenuOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(data.programs[0]?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const [draftProgram, setDraftProgram] = useState<ProgramRecord | null>(null);
  const [documentsByProgram, setDocumentsByProgram] = useState<Record<string, ProgramDocument[]>>({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [floatingExportState, setFloatingExportState] = useState<{ action: (() => Promise<void>) | null }>({ action: null });

  const handleRegisterExportAction = useCallback((action: (() => Promise<void>) | null) => {
    // Wrap in object to prevent React from executing function as updater
    setFloatingExportState({ action });
  }, []);

  const faculties = useMemo(() => FACULTY_OPTIONS, []);
  const modalities = useMemo(() => [...new Set(programs.map((program) => program.modality).filter((value): value is string => Boolean(value)))], [programs]);
  const levels = useMemo(() => [...new Set(programs.map((program) => program.level).filter((value): value is string => Boolean(value)))], [programs]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return programs.filter((program) => {
      const byFaculty = faculty === "Todas" || program.faculty === faculty;
      if (!byFaculty) return false;
      const byModality = modality === "Todas" || program.modality === modality;
      if (!byModality) return false;
      const byLevel = level === "Todos" || program.level === level;
      if (!byLevel) return false;

      const byAcreditable =
        acreditableFilter === "Todos" ||
        (acreditableFilter === "Si" && program.acreditable) ||
        (acreditableFilter === "No" && !program.acreditable);
      if (!byAcreditable) return false;

      const byAccredited =
        accreditedFilter === "Todos" ||
        (accreditedFilter === "Si" && program.accredited) ||
        (accreditedFilter === "No" && !program.accredited);
      if (!byAccredited) return false;

      const byRc =
        rcState === "Todos" ||
        (rcState === "vigente" && program.hasCurrentRc === true) ||
        (rcState === "vencido" && program.hasCurrentRc === false) ||
        (rcState === "sin-definir" && program.hasCurrentRc === null);
      if (!byRc) return false;

      if (!query) return true;

      const corpus = `${program.program} ${program.processCode} ${program.snies} ${program.faculty} ${program.degree} ${program.location} ${program.methodology} ${program.workday} ${program.generalObservations} ${program.programCoordinator}`.toLowerCase();
      return corpus.includes(query);
    });
  }, [programs, faculty, modality, level, acreditableFilter, accreditedFilter, rcState, search]);

  const filteredSummary = useMemo(() => {
    const faculties = new Set(filtered.map((program) => program.faculty)).size;
    const activeRc = filtered.filter((program) => program.hasCurrentRc === true).length;
    const expiredRc = filtered.filter((program) => program.hasCurrentRc === false).length;
    const accredited = filtered.filter((program) => program.accredited).length;
    const inAacProcess = filtered.filter((program) => program.inAccreditationProcess).length;
    const upcomingRrcIn120Days = filtered.filter((program) => {
      if (!program.rcMineducacion) return false;
      const target = new Date(program.rcMineducacion);
      if (Number.isNaN(target.getTime())) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 120;
    }).length;
    return {
      totalPrograms: filtered.length,
      faculties,
      activeRc,
      expiredRc,
      accredited,
      inAacProcess,
      upcomingRrcIn120Days,
    };
  }, [filtered]);

  const selected = isCreatingProgram ? draftProgram : programs.find((program) => program.id === selectedId) ?? null;
  const selectedDocuments = selectedId && !isCreatingProgram ? (documentsByProgram[selectedId] ?? []) : [];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function loadDocuments(programId: string) {
    setLoadingDocuments(true);
    try {
      const response = await fetch(`/api/consolidado-programas/${programId}/documents`);
      const body = (await response.json()) as { data?: ProgramDocument[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudieron cargar los documentos.");
      }

      setDocumentsByProgram((current) => ({
        ...current,
        [programId]: body.data ?? [],
      }));

      setPrograms((current) =>
        current.map((program) => (program.id === programId ? { ...program, documentCount: body.data?.length ?? 0 } : program)),
      );
    } finally {
      setLoadingDocuments(false);
    }
  }

  useEffect(() => {
    if (!modalOpen || !selectedId || isCreatingProgram) return;
    void loadDocuments(selectedId);
  }, [modalOpen, selectedId, isCreatingProgram]);

  // Track previous view to only clear export action when view actually changes
  const prevViewRef = useRef<ViewMode | null>(null);
  useEffect(() => {
    if (prevViewRef.current !== null && prevViewRef.current !== view) {
      setFloatingExportState({ action: null });
    }
    prevViewRef.current = view;
  }, [view]);

  function handleCreateProgram() {
    setDraftProgram(createEmptyProgramDraft());
    setIsCreatingProgram(true);
    setSelectedId(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setIsCreatingProgram(false);
    setDraftProgram(null);
  }

  async function handleSave(program: ProgramRecord) {
    if (data.source !== "supabase") {
      throw new Error("Solo se puede editar cuando la fuente activa es Supabase.");
    }

    if (isCreatingProgram) {
      const response = await fetch("/api/consolidado-programas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapProgramToApiPayload(program)),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "No se pudo crear el programa en Supabase.");
      }

      const body = (await response.json()) as { data?: { id?: string } };
      const createdId = body.data?.id;
      if (!createdId) {
        throw new Error("No se recibió el identificador del nuevo programa.");
      }

      setPrograms((current) => [{ ...program, id: createdId }, ...current]);
      setSelectedId(createdId);
      return;
    }

    if (!selectedId || !isUuid(program.id)) {
      throw new Error("Solo se puede editar cuando la fuente activa es Supabase.");
    }

    const response = await fetch(`/api/consolidado-programas/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapProgramToApiPayload(program)),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error ?? "No se pudo actualizar el programa en Supabase.");
    }

    setPrograms((current) => current.map((item) => (item.id === program.id ? program : item)));
  }

  async function handleAddUrlDocument(programId: string, name: string, url: string) {
    const formData = new FormData();
    formData.append("sourceType", "url");
    formData.append("name", name);
    formData.append("url", url);

    const response = await fetch(`/api/consolidado-programas/${programId}/documents`, {
      method: "POST",
      body: formData,
    });

    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo registrar el enlace.");
    }

    await loadDocuments(programId);
  }

  async function handleUploadDocument(programId: string, file: File, name?: string) {
    const formData = new FormData();
    formData.append("sourceType", "file");
    formData.append("file", file);
    if (name && name.trim()) {
      formData.append("name", name.trim());
    }

    const response = await fetch(`/api/consolidado-programas/${programId}/documents`, {
      method: "POST",
      body: formData,
    });

    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo cargar el archivo.");
    }

    await loadDocuments(programId);
  }

  async function handleDeleteDocument(programId: string, documentId: string) {
    const response = await fetch(`/api/consolidado-programas/${programId}/documents/${documentId}`, {
      method: "DELETE",
    });

    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo eliminar el documento.");
    }

    await loadDocuments(programId);
  }

  async function handleDeleteProgram(programId: string) {
    if (data.source !== "supabase") {
      throw new Error("Solo se puede eliminar cuando la fuente activa es Supabase.");
    }

    if (!isUuid(programId)) {
      throw new Error("ID de programa invalido.");
    }

    const response = await fetch(`/api/consolidado-programas/${programId}`, {
      method: "DELETE",
    });

    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "No se pudo eliminar el programa.");
    }

    setPrograms((current) => {
      const next = current.filter((program) => program.id !== programId);
      setSelectedId(next[0]?.id ?? null);
      return next;
    });

    setDocumentsByProgram((current) => {
      const next = { ...current };
      delete next[programId];
      return next;
    });

    setModalOpen(false);
    setIsCreatingProgram(false);
    setDraftProgram(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.gridOverlay} />

      <div className={`${styles.shell} ${menuOpen ? styles.shellOpen : styles.shellClosed}`}>
        <SidebarMenu
          menuOpen={menuOpen}
          view={view}
          items={MENU_ITEMS}
          currentUser={currentUser}
          currentRole={currentRole}
          canOpenUsers={currentRole === "administrador"}
          onToggle={() => setMenuOpen((value) => !value)}
          onSelect={setView}
          onOpenUsers={() => setView("usuarios")}
          onLogout={handleLogout}
        />

        <main className={styles.main}>
          {view === "consolidado" && (
            <DashboardHeader source={data.source} generatedAt={data.generatedAt} currentUser={currentUser} currentRole={currentRole} />
          )}
          {view === "consolidado" && <KpiGrid summary={filteredSummary} />}

          {view === "consolidado" || view === "registro-calificado" || view === "acreditacion-programas" ? (
            <section className={styles.panel}>
              <FiltersBar
                search={search}
                faculty={faculty}
                faculties={faculties}
                modality={modality}
                level={level}
                acreditableFilter={acreditableFilter}
                accreditedFilter={accreditedFilter}
                rcState={rcState}
                modalities={modalities}
                levels={levels}
                onSearch={setSearch}
                onFacultyChange={setFaculty}
                onModalityChange={setModality}
                onLevelChange={setLevel}
                onAcreditableFilterChange={setAcreditableFilter}
                onAccreditedFilterChange={setAccreditedFilter}
                onRcStateChange={setRcState}
                onCreateProgram={handleCreateProgram}
                showModality={view === "consolidado"}
                showAccreditationState={view === "consolidado"}
                showRcState={view === "consolidado"}
                showCreateProgram={view === "consolidado"}
                rightContent={
                  view === "registro-calificado" ? (
                    <div className={styles.switchWrap}>
                      <span className={styles.switchLabel}>Agrupación</span>
                      <div className={styles.switchGroup}>
                        <button
                          type="button"
                          className={`${styles.switchButton} ${registryGrouping === "programas" ? styles.switchButtonActive : ""}`}
                          onClick={() => setRegistryGrouping("programas")}
                        >
                          Programas
                        </button>
                        <button
                          type="button"
                          className={`${styles.switchButton} ${registryGrouping === "facultades" ? styles.switchButtonActive : ""}`}
                          onClick={() => setRegistryGrouping("facultades")}
                        >
                          Facultades
                        </button>
                      </div>
                    </div>
                  ) : view === "acreditacion-programas" ? (
                    <div className={styles.switchWrap}>
                      <span className={styles.switchLabel}>Agrupación</span>
                      <div className={styles.switchGroup}>
                        <button
                          type="button"
                          className={`${styles.switchButton} ${acreditacionGrouping === "programas" ? styles.switchButtonActive : ""}`}
                          onClick={() => setAcreditacionGrouping("programas")}
                        >
                          Programas
                        </button>
                        <button
                          type="button"
                          className={`${styles.switchButton} ${acreditacionGrouping === "facultades" ? styles.switchButtonActive : ""}`}
                          onClick={() => setAcreditacionGrouping("facultades")}
                        >
                          Facultades
                        </button>
                        <button
                          type="button"
                          className={`${styles.switchButton} ${acreditacionGrouping === "historicos" ? styles.switchButtonActive : ""}`}
                          onClick={() => setAcreditacionGrouping("historicos")}
                        >
                          Históricos
                        </button>
                      </div>
                    </div>
                  ) : null
                }
                createDisabled={data.source !== "supabase"}
              />

              {view === "consolidado" ? (
                <ConsolidadoMatrixView
                  rows={filtered}
                  selectedId={selectedId}
                  onExportReady={handleRegisterExportAction}
                  onSelect={setSelectedId}
                  onOpen={(id) => {
                    setSelectedId(id);
                    setModalOpen(true);
                  }}
                />
              ) : view === "registro-calificado" ? (
                <RegistroCalificadoView
                  rows={filtered}
                  groupingMode={registryGrouping}
                  onExportReady={handleRegisterExportAction}
                />
              ) : (
                <AcreditacionProgramasView
                  rows={filtered}
                  groupingMode={acreditacionGrouping}
                  onExportReady={handleRegisterExportAction}
                />
              )}
            </section>
          ) : view === "visitas-pares" ? (
            <section className={styles.panel}>
              <VisitasParesView programs={programs} onExportReady={handleRegisterExportAction} />
            </section>
          ) : view === "estadisticas" ? (
            <section className={styles.panel}>
              <EstadisticasView programs={programs} subTab={estadisticasSubTab} onSubTabChange={setEstadisticasSubTab} />
            </section>
          ) : view === "usuarios" ? (
            <section className={styles.panel}>
              {currentRole === "administrador" ? (
                <UsersManagementView currentRole={currentRole} onExportReady={handleRegisterExportAction} />
              ) : (
                <p>Solo administrador puede gestionar usuarios.</p>
              )}
            </section>
          ) : (
            <section className={styles.panel}>
              <ExpirationAlertsView rows={programs} onExportReady={handleRegisterExportAction} />
            </section>
          )}
        </main>
      </div>

      {view !== "estadisticas" && floatingExportState.action && (
        <ExportButton onExport={floatingExportState.action} floating label="Descargar" />
      )}

      <ProgramEditModal
        open={modalOpen}
        program={selected}
        faculties={FACULTY_OPTIONS}
        documents={selectedDocuments}
        loadingDocuments={loadingDocuments}
        isCreatingProgram={isCreatingProgram}
        onAddUrlDocument={handleAddUrlDocument}
        onUploadDocument={handleUploadDocument}
        onDeleteDocument={handleDeleteDocument}
        onDeleteProgram={handleDeleteProgram}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
}




