"use client";

import { useEffect, useState } from "react";
import { showToast } from "nextjs-toast-notify";

import type { ProgramDocument, ProgramRecord } from "../types";
import { DURATION_UNIT_OPTIONS, normalizeDurationUnit } from "@/lib/duration";
import { METHODOLOGY_OPTIONS, normalizeMethodology } from "@/lib/methodology";
import styles from "./styles/ProgramEditModal.module.css";

type Props = {
  program: ProgramRecord | null;
  faculties: readonly string[];
  documents: ProgramDocument[];
  loadingDocuments: boolean;
  isCreatingProgram?: boolean;
  onAddUrlDocument: (programId: string, name: string, url: string) => Promise<void>;
  onUploadDocument: (programId: string, file: File, name?: string) => Promise<void>;
  onDeleteDocument: (programId: string, documentId: string) => Promise<void>;
  onDeleteProgram: (programId: string) => Promise<void>;
  open: boolean;
  onClose: () => void;
  onSave: (next: ProgramRecord) => Promise<void>;
};

type BoolString = "" | "true" | "false";

type FormState = {
  processCode: string;
  isActive: "true" | "false";
  faculty: string;
  program: string;
  degree: string;
  snies: string;
  creationAgreement: string;
  noRenewal: string;
  authorizedAdmissionsMen: string;
  admissionPeriodicity: string;
  agreementCode: string;
  agreementIes: string;
  agreementAdministrator: string;
  location: string;
  workday: string;
  regionalized: "Si" | "No" | "Ampliación de lugar de desarrollo";
  level: string;
  academicLevel: string;
  modality: string;
  methodology: string;
  researchCredits: string;
  deepeningCredits: string;
  totalAcademicCredits: string;
  duration: string;
  durationUnit: "" | "Semestres" | "Años";
  reformAcademicCouncil: string;
  reformSuperiorCouncil: string;
  reformMineducacion: string;
  ticPercentage: string;
  hasCurrentRc: BoolString;
  rcResolution: string;
  rcStart: string;
  rcDurationYears: string;
  rcSiga: string;
  rcMineducacion: string;
  rcEnd: string;
  rcExtensionDecree1330: string;
  rcExtensionDecree1174: string;
  rcHistoricalResolutions: string;
  rcResolutionCount: string;
  rcOfficialResolution: string;
  rcDeniedResolution: string;
  numberGraduates: string;
  acreditable: "true" | "false";
  accredited: "true" | "false";
  inAccreditationProcess: "true" | "false";
  aacResolution: string;
  aacStart: string;
  aacDurationYears: string;
  aacCgcaiDelivery: string;
  aacMineducacionFiling: string;
  aacEnd: string;
  aacImprovementHalfway: string;
  aacHistoricalResolutions: string;
  aacResolutionCount: string;
  aacDeniedResolution: string;
  accreditationGuideline: string;
  generalObservations: string;
  programCoordinator: string;
  programCoordinatorEmail: string;
  programCoordinatorTitle: string;
  observacionesAlertaRrc: string;
  observacionesAlertaAcreditados: string;
};

const EMPTY_FORM: FormState = {
  processCode: "",
  isActive: "true",
  faculty: "",
  program: "",
  degree: "",
  snies: "",
  creationAgreement: "",
  noRenewal: "",
  authorizedAdmissionsMen: "",
  admissionPeriodicity: "",
  agreementCode: "",
  agreementIes: "",
  agreementAdministrator: "",
  location: "",
  workday: "",
  regionalized: "No",
  level: "",
  academicLevel: "",
  modality: "",
  methodology: "N/A",
  researchCredits: "",
  deepeningCredits: "",
  totalAcademicCredits: "",
  duration: "",
  durationUnit: "Semestres",
  reformAcademicCouncil: "",
  reformSuperiorCouncil: "",
  reformMineducacion: "",
  ticPercentage: "",
  hasCurrentRc: "",
  rcResolution: "",
  rcStart: "",
  rcDurationYears: "",
  rcSiga: "",
  rcMineducacion: "",
  rcEnd: "",
  rcExtensionDecree1330: "",
  rcExtensionDecree1174: "",
  rcHistoricalResolutions: "",
  rcResolutionCount: "",
  rcOfficialResolution: "",
  rcDeniedResolution: "",
  numberGraduates: "",
  acreditable: "false",
  accredited: "false",
  inAccreditationProcess: "false",
  aacResolution: "",
  aacStart: "",
  aacDurationYears: "",
  aacCgcaiDelivery: "",
  aacMineducacionFiling: "",
  aacEnd: "",
  aacImprovementHalfway: "",
  aacHistoricalResolutions: "",
  aacResolutionCount: "",
  aacDeniedResolution: "",
  accreditationGuideline: "",
  generalObservations: "",
  programCoordinator: "",
  programCoordinatorEmail: "",
  programCoordinatorTitle: "",
  observacionesAlertaRrc: "",
  observacionesAlertaAcreditados: "",
};

const ADMISSION_PERIODICITY_OPTIONS = [
  "Anual",
  "Bimestral",
  "Cada 2 años",
  "Cuatrimestral",
  "Por cohorte",
  "Semestral",
  "Trimestral",
];

const WORKDAY_OPTIONS = ["Diurna", "Nocturna", "Diurna/Nocturna"];

const LEVEL_OPTIONS = [
  "Doctorado",
  "Especialización",
  "Especialización Médico Quirúrgica",
  "Maestría",
  "Profesional Universitario",
  "Tecnología",
];

const ACADEMIC_LEVEL_OPTIONS = ["Posgrado", "Pregrado"];

const MODALITY_OPTIONS = ["Presencial", "Presencial-Virtual", "Virtual"];

function boolToString(value: boolean | null): BoolString {
  if (value === null) return "";
  return value ? "true" : "false";
}

function text(value: string | null): string {
  return value ?? "";
}

function toNullableText(value: string): string | null {
  const clean = value.trim();
  return clean ? clean : null;
}

function parseCoordinatorEmails(value: string): string[] {
  return value
    .split(/[;,\n]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function findInvalidCoordinatorEmails(value: string): string[] {
  return parseCoordinatorEmails(value).filter((email) => !isValidEmail(email));
}

function toNullableCoordinatorEmails(value: string): string | null {
  const emails = parseCoordinatorEmails(value);
  if (emails.length === 0) return null;
  return emails.join("; ");
}

function toNullableNumber(value: string): number | null {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableBool(value: BoolString): boolean | null {
  if (value === "") return null;
  return value === "true";
}

function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonthsToIsoDate(isoDate: string, months: number): string | null {
  const baseDate = parseIsoDate(isoDate);
  if (!baseDate || !Number.isFinite(months)) return null;
  baseDate.setUTCMonth(baseDate.getUTCMonth() + months);
  return formatIsoDate(baseDate);
}

function calculateRcDerivedDates(rcStart: string, rcDurationYears: string) {
  const cleanStart = rcStart.trim();
  const years = Number(rcDurationYears.trim());

  if (!cleanStart || !Number.isFinite(years) || years <= 0) {
    return null;
  }

  const durationInMonths = Math.round(years * 12);
  const rcEnd = addMonthsToIsoDate(cleanStart, durationInMonths);
  if (!rcEnd) return null;

  const rcSiga = addMonthsToIsoDate(rcEnd, -14);
  const rcMineducacion = addMonthsToIsoDate(rcEnd, -12);

  if (!rcSiga || !rcMineducacion) return null;

  return { rcEnd, rcSiga, rcMineducacion };
}

function mapProgramToForm(program: ProgramRecord | null): FormState {
  if (!program) return EMPTY_FORM;

  return {
    processCode: program.processCode,
    isActive: program.isActive === false ? "false" : "true",
    faculty: program.faculty,
    program: program.program,
    degree: text(program.degree),
    snies: text(program.snies),
    creationAgreement: text(program.creationAgreement),
    noRenewal: text(program.noRenewal),
    authorizedAdmissionsMen: program.authorizedAdmissionsMen?.toString() ?? "",
    admissionPeriodicity: text(program.admissionPeriodicity),
    agreementCode: text(program.agreementCode),
    agreementIes: text(program.agreementIes),
    agreementAdministrator: text(program.agreementAdministrator),
    location: text(program.location),
    workday: text(program.workday),
    regionalized: program.regionalized,
    level: text(program.level),
    academicLevel: text(program.academicLevel),
    modality: text(program.modality),
    methodology: normalizeMethodology(program.methodology),
    researchCredits: program.researchCredits?.toString() ?? "",
    deepeningCredits: program.deepeningCredits?.toString() ?? "",
    totalAcademicCredits: program.totalAcademicCredits?.toString() ?? "",
    duration: program.duration?.toString() ?? "",
    durationUnit: normalizeDurationUnit(program.durationUnit) ?? (program.duration !== null ? "Semestres" : ""),
    reformAcademicCouncil: text(program.reformAcademicCouncil),
    reformSuperiorCouncil: text(program.reformSuperiorCouncil),
    reformMineducacion: text(program.reformMineducacion),
    ticPercentage: program.ticPercentage?.toString() ?? "",
    hasCurrentRc: boolToString(program.hasCurrentRc),
    rcResolution: text(program.rcResolution),
    rcStart: text(program.rcStart),
    rcDurationYears: program.rcDurationYears?.toString() ?? "",
    rcSiga: text(program.rcSiga),
    rcMineducacion: text(program.rcMineducacion),
    rcEnd: text(program.rcEnd),
    rcExtensionDecree1330: text(program.rcExtensionDecree1330),
    rcExtensionDecree1174: text(program.rcExtensionDecree1174),
    rcHistoricalResolutions: text(program.rcHistoricalResolutions),
    rcResolutionCount: program.rcResolutionCount?.toString() ?? "",
    rcOfficialResolution: text(program.rcOfficialResolution),
    rcDeniedResolution: text(program.rcDeniedResolution),
    numberGraduates: program.numberGraduates?.toString() ?? "",
    acreditable: program.acreditable ? "true" : "false",
    accredited: program.accredited ? "true" : "false",
    inAccreditationProcess: program.inAccreditationProcess ? "true" : "false",
    aacResolution: text(program.aacResolution),
    aacStart: text(program.aacStart),
    aacDurationYears: program.aacDurationYears?.toString() ?? "",
    aacCgcaiDelivery: text(program.aacCgcaiDelivery),
    aacMineducacionFiling: text(program.aacMineducacionFiling),
    aacEnd: text(program.aacEnd),
    aacImprovementHalfway: text(program.aacImprovementHalfway),
    aacHistoricalResolutions: text(program.aacHistoricalResolutions),
    aacResolutionCount: program.aacResolutionCount?.toString() ?? "",
    aacDeniedResolution: text(program.aacDeniedResolution),
    accreditationGuideline: text(program.accreditationGuideline),
    generalObservations: text(program.generalObservations),
    programCoordinator: text(program.programCoordinator),
    programCoordinatorEmail: text(program.programCoordinatorEmail),
    programCoordinatorTitle: text(program.programCoordinatorTitle),
    observacionesAlertaRrc: text(program.observacionesAlertaRrc),
    observacionesAlertaAcreditados: text(program.observacionesAlertaAcreditados),
  };
}

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number" | "email";
  required?: boolean;
  step?: string;
};

function Field({ label, value, onChange, type = "text", required, step }: InputProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        step={step}
      />
    </label>
  );
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
};

function SelectField({ label, value, onChange, options, required }: SelectProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextareaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextareaField({ label, value, onChange }: TextareaProps) {
  return (
    <label className={styles.textareaField}>
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
    </label>
  );
}

export function ProgramEditModal({
  program,
  faculties,
  documents,
  loadingDocuments,
  isCreatingProgram = false,
  onAddUrlDocument,
  onUploadDocument,
  onDeleteDocument,
  onDeleteProgram,
  open,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(mapProgramToForm(program));
      setError(null);
      setDocError(null);
    }
  }, [open, program]);

  useEffect(() => {
    if (!open) return;

    setForm((previous) => {
      const computed = calculateRcDerivedDates(previous.rcStart, previous.rcDurationYears);
      if (!computed) return previous;

      if (
        previous.rcEnd === computed.rcEnd &&
        previous.rcSiga === computed.rcSiga &&
        previous.rcMineducacion === computed.rcMineducacion
      ) {
        return previous;
      }

      return {
        ...previous,
        rcEnd: computed.rcEnd,
        rcSiga: computed.rcSiga,
        rcMineducacion: computed.rcMineducacion,
      };
    });
  }, [open, form.rcStart, form.rcDurationYears]);

  if (!open || !program) return null;

  const isProgramInactiveLocked = !isCreatingProgram && form.isActive === "false";

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildProgramPayload = (nextIsActive?: boolean): ProgramRecord => ({
    ...program,
    processCode: form.processCode.trim(),
    isActive: nextIsActive ?? (form.isActive === "true"),
    faculty: form.faculty.trim(),
    program: form.program.trim(),
    degree: toNullableText(form.degree),
    snies: toNullableText(form.snies),
    creationAgreement: toNullableText(form.creationAgreement),
    noRenewal: toNullableText(form.noRenewal),
    authorizedAdmissionsMen: toNullableNumber(form.authorizedAdmissionsMen),
    admissionPeriodicity: toNullableText(form.admissionPeriodicity),
    agreementCode: toNullableText(form.agreementCode),
    agreementIes: toNullableText(form.agreementIes),
    agreementAdministrator: toNullableText(form.agreementAdministrator),
    location: toNullableText(form.location),
    workday: toNullableText(form.workday),
    regionalized: form.regionalized,
    level: toNullableText(form.level),
    academicLevel: toNullableText(form.academicLevel),
    modality: toNullableText(form.modality),
    methodology: normalizeMethodology(form.methodology),
    researchCredits: toNullableNumber(form.researchCredits),
    deepeningCredits: toNullableNumber(form.deepeningCredits),
    totalAcademicCredits: toNullableNumber(form.totalAcademicCredits),
    duration: toNullableNumber(form.duration),
    durationUnit: form.duration.trim() ? normalizeDurationUnit(form.durationUnit) ?? "Semestres" : null,
    reformAcademicCouncil: toNullableText(form.reformAcademicCouncil),
    reformSuperiorCouncil: toNullableText(form.reformSuperiorCouncil),
    reformMineducacion: toNullableText(form.reformMineducacion),
    ticPercentage: toNullableNumber(form.ticPercentage),
    hasCurrentRc: toNullableBool(form.hasCurrentRc),
    rcResolution: toNullableText(form.rcResolution),
    rcStart: toNullableText(form.rcStart),
    rcDurationYears: toNullableNumber(form.rcDurationYears),
    rcSiga: toNullableText(form.rcSiga),
    rcMineducacion: toNullableText(form.rcMineducacion),
    rcEnd: toNullableText(form.rcEnd),
    rcExtensionDecree1330: toNullableText(form.rcExtensionDecree1330),
    rcExtensionDecree1174: toNullableText(form.rcExtensionDecree1174),
    rcHistoricalResolutions: toNullableText(form.rcHistoricalResolutions),
    rcResolutionCount: toNullableNumber(form.rcResolutionCount),
    rcOfficialResolution: toNullableText(form.rcOfficialResolution),
    rcDeniedResolution: toNullableText(form.rcDeniedResolution),
    numberGraduates: toNullableNumber(form.numberGraduates),
    acreditable: form.acreditable === "true",
    accredited: form.accredited === "true",
    inAccreditationProcess: form.inAccreditationProcess === "true",
    aacResolution: toNullableText(form.aacResolution),
    aacStart: toNullableText(form.aacStart),
    aacDurationYears: toNullableNumber(form.aacDurationYears),
    aacCgcaiDelivery: toNullableText(form.aacCgcaiDelivery),
    aacMineducacionFiling: toNullableText(form.aacMineducacionFiling),
    aacEnd: toNullableText(form.aacEnd),
    aacImprovementHalfway: toNullableText(form.aacImprovementHalfway),
    aacHistoricalResolutions: toNullableText(form.aacHistoricalResolutions),
    aacResolutionCount: toNullableNumber(form.aacResolutionCount),
    aacDeniedResolution: toNullableText(form.aacDeniedResolution),
    accreditationGuideline: toNullableText(form.accreditationGuideline),
    generalObservations: toNullableText(form.generalObservations),
    programCoordinator: toNullableText(form.programCoordinator),
    programCoordinatorEmail: toNullableCoordinatorEmails(form.programCoordinatorEmail),
    programCoordinatorTitle: toNullableText(form.programCoordinatorTitle),
    observacionesAlertaRrc: toNullableText(form.observacionesAlertaRrc),
    observacionesAlertaAcreditados: toNullableText(form.observacionesAlertaAcreditados),
  });

  const handleAddUrl = async () => {
    const cleanUrl = docUrl.trim();
    if (!cleanUrl) {
      setDocError("Debes ingresar una URL valida.");
      showToast.error("Debes ingresar una URL valida.", { position: "top-right", transition: "slideInUp", duration: 2600 });
      return;
    }

    setUploadingDoc(true);
    setDocError(null);
    try {
      await onAddUrlDocument(program.id, docName.trim(), cleanUrl);
      setDocName("");
      setDocUrl("");
      showToast.success("Enlace agregado correctamente.", { position: "top-right", transition: "bounceIn", duration: 2600 });
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "No se pudo agregar el enlace.";
      setDocError(message);
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setDocError(null);
    try {
      await onUploadDocument(program.id, file, docName.trim() || undefined);
      setDocName("");
      showToast.success("Archivo cargado correctamente.", { position: "top-right", transition: "bounceIn", duration: 2600 });
      event.target.value = "";
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "No se pudo cargar el archivo.";
      setDocError(message);
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (documentId: string) => {
    setUploadingDoc(true);
    setDocError(null);
    try {
      await onDeleteDocument(program.id, documentId);
      showToast.warning("Documento eliminado.", { position: "top-right", transition: "slideInUp", duration: 2600 });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el documento.";
      setDocError(message);
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isProgramInactiveLocked) {
      const message = "Este programa está desactivado. Reactívalo para poder editarlo.";
      setError(message);
      showToast.warning(message, { position: "top-right", transition: "slideInUp", duration: 2800 });
      return;
    }

    const invalidCoordinatorEmails = findInvalidCoordinatorEmails(form.programCoordinatorEmail);
    if (invalidCoordinatorEmails.length > 0) {
      const message = `Hay correos invalidos en coordinador: ${invalidCoordinatorEmails.join(", ")}`;
      setError(message);
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3200 });
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(buildProgramPayload());
      showToast.success("Cambios guardados correctamente.", { position: "top-right", transition: "bounceIn", duration: 2800 });
      window.setTimeout(() => onClose(), 850);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "No se pudo guardar el programa.";
      setError(message);
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProgramActive = async () => {
    if (isCreatingProgram) return;

    const nextIsActive = form.isActive !== "true";
    const actionLabel = nextIsActive ? "reactivar" : "desactivar";
    const confirmed = window.confirm(`¿Seguro que deseas ${actionLabel} este programa?`);
    if (!confirmed) return;

    setTogglingActive(true);
    setError(null);
    try {
      await onSave(buildProgramPayload(nextIsActive));
      setForm((prev) => ({ ...prev, isActive: nextIsActive ? "true" : "false" }));
      showToast.success(
        nextIsActive ? "Programa reactivado correctamente." : "Programa desactivado correctamente.",
        { position: "top-right", transition: "bounceIn", duration: 2600 },
      );
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : "No se pudo actualizar el estado del programa.";
      setError(message);
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setTogglingActive(false);
    }
  };

  const handleDeleteProgram = async () => {
    if (isCreatingProgram || !program.id) return;

    const confirmed = window.confirm("¿Seguro que deseas eliminar este programa? Esta acción no se puede deshacer.");
    if (!confirmed) return;

    setDeletingProgram(true);
    setError(null);

    try {
      await onDeleteProgram(program.id);
      showToast.warning("Programa eliminado.", { position: "top-right", transition: "slideInUp", duration: 2600 });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el programa.";
      setError(message);
      showToast.error(message, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setDeletingProgram(false);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{isCreatingProgram ? "Nuevo programa" : "Editar programa completo"}</h3>
            <p className={styles.subtitle}>
              {isCreatingProgram
                ? "Completa la información base para registrar un nuevo programa en el sistema."
                : "Selecciona un programa y vuelve a hacer clic para abrir este formulario."}
            </p>
          </div>
          <button type="button" onClick={onClose} className={styles.closeButton}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {isProgramInactiveLocked && (
            <p className={styles.lockNotice}>Programa desactivado: solo puedes reactivarlo desde el botón inferior.</p>
          )}

          <fieldset className={styles.fieldsetReset} disabled={isProgramInactiveLocked}>
          <section className={`${styles.section} ${styles.sectionBlue}`}>
            <h4>Informacion basica</h4>
            <div className={styles.grid}>
              <Field label="Codigo proceso" value={form.processCode} onChange={(value) => setField("processCode", value)} required />
              <SelectField
                label="Facultad"
                value={form.faculty}
                onChange={(value) => setField("faculty", value)}
                required={isCreatingProgram}
                options={faculties.map((faculty) => ({ value: faculty, label: faculty }))}
              />
              <Field label="Programa" value={form.program} onChange={(value) => setField("program", value)} required />
              <Field label="Titulo otorgado" value={form.degree} onChange={(value) => setField("degree", value)} required={isCreatingProgram} />
              <Field label="SNIES" value={form.snies} onChange={(value) => setField("snies", value)} />
            </div>
          </section>

          <section className={`${styles.section} ${styles.sectionAmber}`}>
            <h4>Administrativo y ubicación</h4>
            <div className={styles.grid}>
              <Field label="Acuerdo creacion" value={form.creationAgreement} onChange={(value) => setField("creationAgreement", value)} />
              <Field label="No renovacion" value={form.noRenewal} onChange={(value) => setField("noRenewal", value)} />
              <Field label="Admitidos MEN" type="number" value={form.authorizedAdmissionsMen} onChange={(value) => setField("authorizedAdmissionsMen", value)} />
              <SelectField
                label="Periodicidad del programa"
                value={form.admissionPeriodicity}
                onChange={(value) => setField("admissionPeriodicity", value)}
                options={[
                  { value: "", label: "Sin definir" },
                  ...ADMISSION_PERIODICITY_OPTIONS.map((option) => ({ value: option, label: option })),
                ]}
              />
              <Field label="Codigo convenio" value={form.agreementCode} onChange={(value) => setField("agreementCode", value)} />
              <Field label="IES convenio" value={form.agreementIes} onChange={(value) => setField("agreementIes", value)} />
              <Field label="Administrador convenio" value={form.agreementAdministrator} onChange={(value) => setField("agreementAdministrator", value)} />
              <Field label="Lugar de desarrollo" value={form.location} onChange={(value) => setField("location", value)} />
              <SelectField
                label="Jornada"
                value={form.workday}
                onChange={(value) => setField("workday", value)}
                options={[
                  { value: "", label: "Sin definir" },
                  ...WORKDAY_OPTIONS.map((option) => ({ value: option, label: option })),
                ]}
              />
              <SelectField
                label="Regionalizado"
                value={form.regionalized}
                onChange={(value) => setField("regionalized", value)}
                options={[
                  { value: "No", label: "No" },
                  { value: "Si", label: "Si" },
                  { value: "Ampliación de lugar de desarrollo", label: "Ampliación de lugar de desarrollo" },
                ]}
              />
              <SelectField
                label="Nivel de formación académico"
                value={form.level}
                onChange={(value) => setField("level", value)}
                options={[
                  { value: "", label: "Sin definir" },
                  ...LEVEL_OPTIONS.map((option) => ({ value: option, label: option })),
                ]}
              />
              <SelectField
                label="Nivel academico"
                value={form.academicLevel}
                onChange={(value) => setField("academicLevel", value)}
                options={[
                  { value: "", label: "Sin definir" },
                  ...ACADEMIC_LEVEL_OPTIONS.map((option) => ({ value: option, label: option })),
                ]}
              />
              <SelectField
                label="Modalidad"
                value={form.modality}
                onChange={(value) => setField("modality", value)}
                options={[
                  { value: "", label: "Sin definir" },
                  ...MODALITY_OPTIONS.map((option) => ({ value: option, label: option })),
                ]}
              />
              <SelectField
                label="Metodologia"
                value={form.methodology}
                onChange={(value) => setField("methodology", value)}
                options={METHODOLOGY_OPTIONS.map((option) => ({ value: option, label: option }))}
              />
            </div>
          </section>

          <section className={`${styles.section} ${styles.sectionEmerald}`}>
            <h4>Creditos y reformas</h4>
            <div className={styles.grid}>
              <Field label="Creditos investigacion" type="number" value={form.researchCredits} onChange={(value) => setField("researchCredits", value)} />
              <Field label="Creditos profundizacion" type="number" value={form.deepeningCredits} onChange={(value) => setField("deepeningCredits", value)} />
              <Field label="Total creditos academicos" type="number" value={form.totalAcademicCredits} onChange={(value) => setField("totalAcademicCredits", value)} />
              <Field label="Duracion (valor)" type="number" value={form.duration} onChange={(value) => setField("duration", value)} />
              <SelectField
                label="Duracion (unidad)"
                value={form.durationUnit}
                onChange={(value) => setField("durationUnit", value)}
                options={[
                  { value: "", label: "Sin definir" },
                  ...DURATION_UNIT_OPTIONS.map((option) => ({ value: option, label: option })),
                ]}
              />
              <Field label="Reforma consejo academico" value={form.reformAcademicCouncil} onChange={(value) => setField("reformAcademicCouncil", value)} />
              <Field label="Reforma consejo superior" value={form.reformSuperiorCouncil} onChange={(value) => setField("reformSuperiorCouncil", value)} />
              <Field label="Reforma Mineducacion" value={form.reformMineducacion} onChange={(value) => setField("reformMineducacion", value)} />
              <Field label="Porcentaje TIC" type="number" step="0.01" value={form.ticPercentage} onChange={(value) => setField("ticPercentage", value)} />
            </div>
          </section>

          <section className={`${styles.section} ${styles.sectionSky}`}>
            <h4>Registro calificado (RC)</h4>
            <div className={styles.grid}>
              <SelectField
                label="RC vigente"
                value={form.hasCurrentRc}
                onChange={(value) => setField("hasCurrentRc", value)}
                options={[
                  { value: "", label: "Sin definir" },
                  { value: "true", label: "Si" },
                  { value: "false", label: "No" },
                ]}
              />
              <Field label="Resolucion RC" value={form.rcResolution} onChange={(value) => setField("rcResolution", value)} />
              <Field label="Inicio RC" type="date" value={form.rcStart} onChange={(value) => setField("rcStart", value)} />
              <Field label="Duracion RC (anios)" type="number" step="0.1" value={form.rcDurationYears} onChange={(value) => setField("rcDurationYears", value)} />
              <Field label="RC SIGA" type="date" value={form.rcSiga} onChange={(value) => setField("rcSiga", value)} />
              <Field label="RC Mineducacion" type="date" value={form.rcMineducacion} onChange={(value) => setField("rcMineducacion", value)} />
              <Field label="Vencimiento RC" type="date" value={form.rcEnd} onChange={(value) => setField("rcEnd", value)} />
              <Field label="Prorroga decreto 1330" type="date" value={form.rcExtensionDecree1330} onChange={(value) => setField("rcExtensionDecree1330", value)} />
              <Field label="Prorroga decreto 1174" type="date" value={form.rcExtensionDecree1174} onChange={(value) => setField("rcExtensionDecree1174", value)} />
              <Field label="Cantidad resoluciones RC" type="number" value={form.rcResolutionCount} onChange={(value) => setField("rcResolutionCount", value)} />
              <Field label="Resolucion RC oficio" value={form.rcOfficialResolution} onChange={(value) => setField("rcOfficialResolution", value)} />
              <Field label="Resolucion RC negada" value={form.rcDeniedResolution} onChange={(value) => setField("rcDeniedResolution", value)} />
              <Field label="Numero egresados" type="number" value={form.numberGraduates} onChange={(value) => setField("numberGraduates", value)} />
            </div>
            <TextareaField label="Historico resoluciones RC" value={form.rcHistoricalResolutions} onChange={(value) => setField("rcHistoricalResolutions", value)} />
          </section>

          <section className={`${styles.section} ${styles.sectionViolet}`}>
            <h4>Acreditacion (AAC)</h4>
            <div className={styles.grid}>
              <SelectField
                label="Acreditable"
                value={form.acreditable}
                onChange={(value) => setField("acreditable", value)}
                options={[
                  { value: "true", label: "Si" },
                  { value: "false", label: "No" },
                ]}
              />
              <SelectField
                label="Acreditado"
                value={form.accredited}
                onChange={(value) => setField("accredited", value)}
                options={[
                  { value: "true", label: "Si" },
                  { value: "false", label: "No" },
                ]}
              />
              <SelectField
                label="En proceso AAC"
                value={form.inAccreditationProcess}
                onChange={(value) => setField("inAccreditationProcess", value)}
                options={[
                  { value: "true", label: "Si" },
                  { value: "false", label: "No" },
                ]}
              />
              <Field label="Resolucion AAC" value={form.aacResolution} onChange={(value) => setField("aacResolution", value)} />
              <Field label="Inicio AAC" type="date" value={form.aacStart} onChange={(value) => setField("aacStart", value)} />
              <Field label="Duracion AAC (anios)" type="number" step="0.1" value={form.aacDurationYears} onChange={(value) => setField("aacDurationYears", value)} />
              <Field label="Entrega CGCAI" type="date" value={form.aacCgcaiDelivery} onChange={(value) => setField("aacCgcaiDelivery", value)} />
              <Field label="Radicacion Mineducacion" type="date" value={form.aacMineducacionFiling} onChange={(value) => setField("aacMineducacionFiling", value)} />
              <Field label="Vencimiento AAC" type="date" value={form.aacEnd} onChange={(value) => setField("aacEnd", value)} />
              <Field label="Mitad vigencia AAC" type="date" value={form.aacImprovementHalfway} onChange={(value) => setField("aacImprovementHalfway", value)} />
              <Field label="Cantidad resoluciones AAC" type="number" value={form.aacResolutionCount} onChange={(value) => setField("aacResolutionCount", value)} />
              <Field label="Resolucion AAC negada" value={form.aacDeniedResolution} onChange={(value) => setField("aacDeniedResolution", value)} />
            </div>
            <TextareaField label="Historico resoluciones AAC" value={form.aacHistoricalResolutions} onChange={(value) => setField("aacHistoricalResolutions", value)} />
          </section>

          <section className={`${styles.section} ${styles.sectionSlate}`}>
            <h4>Observaciones y responsable</h4>
            <div className={styles.grid}>
              <Field label="Coordinador del programa" value={form.programCoordinator} onChange={(value) => setField("programCoordinator", value)} />
              <Field
                label="Correo(s) del coordinador (separados por ; o ,)"
                value={form.programCoordinatorEmail}
                onChange={(value) => setField("programCoordinatorEmail", value)}
              />
              <Field label="Titulo del coordinador" value={form.programCoordinatorTitle} onChange={(value) => setField("programCoordinatorTitle", value)} />
            </div>
            <p className={styles.fieldNote}>Ejemplo: coord1@udla.edu.co; coord2@udla.edu.co</p>
            <TextareaField label="Lineamiento de acreditacion" value={form.accreditationGuideline} onChange={(value) => setField("accreditationGuideline", value)} />
            <TextareaField label="Observaciones generales" value={form.generalObservations} onChange={(value) => setField("generalObservations", value)} />
            <TextareaField label="Observaciones alerta RRC" value={form.observacionesAlertaRrc} onChange={(value) => setField("observacionesAlertaRrc", value)} />
            <TextareaField label="Observaciones alerta acreditados" value={form.observacionesAlertaAcreditados} onChange={(value) => setField("observacionesAlertaAcreditados", value)} />
          </section>

          <section className={`${styles.section} ${styles.sectionRose}`}>
            <h4>Documentos asociados</h4>
            {isCreatingProgram ? (
              <p className={styles.docHint}>Guarda el programa primero para poder asociarle documentos.</p>
            ) : (
              <>
                <div className={styles.docGrid}>
                  <Field label="Nombre del documento (opcional)" value={docName} onChange={setDocName} />
                  <Field label="Enlace URL" value={docUrl} onChange={setDocUrl} />
                  <button type="button" className={styles.docActionButton} onClick={handleAddUrl} disabled={uploadingDoc || !docUrl.trim()}>
                    Agregar enlace
                  </button>
                  <label className={styles.filePicker}>
                    <span>Seleccionar archivo</span>
                    <input className={styles.fileInput} type="file" onChange={handleUploadFile} disabled={uploadingDoc} />
                  </label>
                </div>

                {docError && <p className={styles.error}>{docError}</p>}

                {loadingDocuments ? (
                  <p className={styles.docHint}>Cargando documentos...</p>
                ) : documents.length === 0 ? (
                  <p className={styles.docHint}>No hay documentos asociados para este programa.</p>
                ) : (
                  <ul className={styles.docList}>
                    {documents.map((document) => (
                      <li key={document.id} className={styles.docItem}>
                        <a href={document.url} target="_blank" rel="noreferrer" className={styles.docLink}>
                          {document.name}
                        </a>
                        <span className={styles.docType}>{document.sourceType === "file" ? "Archivo" : "URL"}</span>
                        <button
                          type="button"
                          className={styles.removeDoc}
                          onClick={() => handleDeleteDoc(document.id)}
                          disabled={uploadingDoc}
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
          </fieldset>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            {!isCreatingProgram && (
              <div className={styles.actionsLeft}>
                <button
                  type="button"
                  onClick={handleToggleProgramActive}
                  className={styles.warning}
                  disabled={saving || togglingActive || deletingProgram}
                >
                  {togglingActive ? "Actualizando..." : form.isActive === "true" ? "Desactivar programa" : "Reactivar programa"}
                </button>
                <button type="button" onClick={handleDeleteProgram} className={styles.danger} disabled={saving || togglingActive || deletingProgram}>
                  {deletingProgram ? "Eliminando..." : "Eliminar programa"}
                </button>
              </div>
            )}

            <div className={styles.actionsRight}>
              <button type="button" onClick={onClose} className={styles.secondary} disabled={deletingProgram || togglingActive}>
                Cancelar
              </button>
              <button type="submit" className={styles.primary} disabled={saving || togglingActive || deletingProgram || isProgramInactiveLocked}>
                {saving ? "Guardando..." : isCreatingProgram ? "Crear programa" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
