"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConsolidadoDashboard } from "@/lib/consolidado";

import { FiltersBar } from "./common/FiltersBar";
import { FACULTY_OPTIONS } from "./constants";
import { DashboardHeader } from "./layout/DashboardHeader";
import { SidebarMenu } from "./layout/SidebarMenu";
import styles from "./styles/DashboardShell.module.css";
import type { MenuItem, ProgramDocument, ProgramRecord, ViewMode } from "./types";
import { ConsolidadoMatrixView } from "./views/ConsolidadoMatrixView";
import { ExpirationAlertsView } from "./views/ExpirationAlertsView";
import { ProgramEditModal } from "./views/ProgramEditModal";
import { KpiGrid } from "./widgets/KpiGrid";

type Props = {
  data: ConsolidadoDashboard;
};

const MENU_ITEMS: MenuItem[] = [
  { id: "consolidado", label: "Consolidado", subtitle: "Matriz editable" },
  { id: "alertas", label: "Alertas", subtitle: "Vencimientos RRC/AAC" },
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

export function ConsolidadoDashboardClient({ data }: Props) {
  const [programs, setPrograms] = useState<ProgramRecord[]>(data.programs);
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("Todas");
  const [modality, setModality] = useState("Todas");
  const [level, setLevel] = useState("Todos");
  const [accreditationState, setAccreditationState] = useState("Todos");
  const [rcState, setRcState] = useState("Todos");
  const [view, setView] = useState<ViewMode>("consolidado");
  const [menuOpen, setMenuOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(data.programs[0]?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const [draftProgram, setDraftProgram] = useState<ProgramRecord | null>(null);
  const [documentsByProgram, setDocumentsByProgram] = useState<Record<string, ProgramDocument[]>>({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);

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

      const byAccreditation =
        accreditationState === "Todos" ||
        (accreditationState === "acreditado" && program.accredited) ||
        (accreditationState === "acreditable" && program.acreditable && !program.accredited) ||
        (accreditationState === "proceso" && program.inAccreditationProcess) ||
        (accreditationState === "ninguno" && !program.acreditable && !program.accredited && !program.inAccreditationProcess);
      if (!byAccreditation) return false;

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
  }, [programs, faculty, modality, level, accreditationState, rcState, search]);

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
    } finally {
      setLoadingDocuments(false);
    }
  }

  useEffect(() => {
    if (!modalOpen || !selectedId || isCreatingProgram) return;
    void loadDocuments(selectedId);
  }, [modalOpen, selectedId, isCreatingProgram]);

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

  return (
    <div className={styles.page}>
      <div className={styles.gridOverlay} />

      <div className={`${styles.shell} ${menuOpen ? styles.shellOpen : styles.shellClosed}`}>
        <SidebarMenu
          menuOpen={menuOpen}
          view={view}
          items={MENU_ITEMS}
          onToggle={() => setMenuOpen((value) => !value)}
          onSelect={setView}
        />

        <main className={styles.main}>
          <DashboardHeader source={data.source} generatedAt={data.generatedAt} />
          {view === "consolidado" && <KpiGrid summary={filteredSummary} />}

          {view === "consolidado" ? (
            <section className={styles.panel}>
              <FiltersBar
                search={search}
                faculty={faculty}
                faculties={faculties}
                modality={modality}
                level={level}
                accreditationState={accreditationState}
                rcState={rcState}
                modalities={modalities}
                levels={levels}
                onSearch={setSearch}
                onFacultyChange={setFaculty}
                onModalityChange={setModality}
                onLevelChange={setLevel}
                onAccreditationStateChange={setAccreditationState}
                onRcStateChange={setRcState}
                onCreateProgram={handleCreateProgram}
                createDisabled={data.source !== "supabase"}
              />

              <ConsolidadoMatrixView
                rows={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onOpen={(id) => {
                  setSelectedId(id);
                  setModalOpen(true);
                }}
              />
            </section>
          ) : (
            <section className={styles.panel}>
              <ExpirationAlertsView rows={programs} />
            </section>
          )}
        </main>
      </div>

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
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
}

