import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { ProgramRecord } from "@/components/consolidado/types";
import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";
import { normalizeDurationUnit } from "@/lib/duration";
import { normalizeMethodology } from "@/lib/methodology";

const FACULTY_OPTIONS = new Set([
  "Facultad de Artes",
  "Facultad de Ciencias Agrarias",
  "Facultad de Ciencias Contables, Económicas y Administrativas",
  "Facultad de Ciencias de la Salud",
  "Facultad de Ciencias Humanas y Sociales",
  "Facultad de Ciencias Naturales, Exactas y de la Educación",
  "Facultad de Derecho, Ciencias Políticas y Sociales",
  "Facultad de Ingeniería Civil",
  "Facultad de Ingeniería Electrónica y Telecomunicaciones",
]);

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for admin updates.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function normalizeRegionalized(value: unknown): "Si" | "No" | "Ampliación de lugar de desarrollo" {
  if (typeof value === "boolean") return value ? "Si" : "No";

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "No";
  if (normalized === "true" || normalized === "si" || normalized === "sí") return "Si";
  if (normalized === "false" || normalized === "no") return "No";
  if (normalized.includes("ampliacion") || normalized.includes("ampliación")) return "Ampliación de lugar de desarrollo";
  return "No";
}

function mapPayloadToInsert(payload: ProgramRecord) {
  return {
    process_code: payload.processCode,
    is_active: payload.isActive ?? true,
    faculty: payload.faculty,
    program: payload.program,
    degree: payload.degree || null,
    snies: payload.snies || null,
    creation_agreement: payload.creationAgreement || null,
    no_renewal: payload.noRenewal || null,
    authorized_admissions_men: payload.authorizedAdmissionsMen || null,
    admission_periodicity: payload.admissionPeriodicity || null,
    agreement_code: payload.agreementCode || null,
    agreement_ies: payload.agreementIes || null,
    agreement_administrator: payload.agreementAdministrator || null,
    location: payload.location || null,
    workday: payload.workday || null,
    regionalized: normalizeRegionalized(payload.regionalized),
    level: payload.level || null,
    academic_level: payload.academicLevel || null,
    modality: payload.modality || null,
    methodology: normalizeMethodology(payload.methodology),
    research_credits: payload.researchCredits || null,
    deepening_credits: payload.deepeningCredits || null,
    total_academic_credits: payload.totalAcademicCredits || null,
    duration: payload.duration || null,
    duration_unit: payload.duration ? normalizeDurationUnit(payload.durationUnit) ?? "Semestres" : null,
    reform_academic_council: payload.reformAcademicCouncil || null,
    reform_superior_council: payload.reformSuperiorCouncil || null,
    reform_mineducacion: payload.reformMineducacion || null,
    tic_percentage: payload.ticPercentage || null,
    has_current_rc: payload.hasCurrentRc || null,
    rc_resolution: payload.rcResolution || null,
    rc_start: payload.rcStart || null,
    rc_duration_years: payload.rcDurationYears || null,
    rc_siga: payload.rcSiga || null,
    rc_mineducacion: payload.rcMineducacion || null,
    rc_end: payload.rcEnd || null,
    rc_extension_decree_1330: payload.rcExtensionDecree1330 || null,
    rc_extension_decree_1174: payload.rcExtensionDecree1174 || null,
    rc_historical_resolutions: payload.rcHistoricalResolutions || null,
    rc_resolution_count: payload.rcResolutionCount || null,
    rc_official_resolution: payload.rcOfficialResolution || null,
    rc_denied_resolution: payload.rcDeniedResolution || null,
    number_graduates: payload.numberGraduates || null,
    acreditable: payload.acreditable || false,
    accredited: payload.accredited || false,
    in_accreditation_process: payload.inAccreditationProcess || false,
    aac_resolution: payload.aacResolution || null,
    aac_start: payload.aacStart || null,
    aac_duration_years: payload.aacDurationYears || null,
    aac_cgcai_delivery: payload.aacCgcaiDelivery || null,
    aac_mineducacion_filing: payload.aacMineducacionFiling || null,
    aac_end: payload.aacEnd || null,
    aac_improvement_halfway: payload.aacImprovementHalfway || null,
    aac_historical_resolutions: payload.aacHistoricalResolutions || null,
    aac_resolution_count: payload.aacResolutionCount || null,
    aac_denied_resolution: payload.aacDeniedResolution || null,
    accreditation_guideline: payload.accreditationGuideline || null,
    general_observations: payload.generalObservations || null,
    program_coordinator: payload.programCoordinator || null,
    program_coordinator_email: payload.programCoordinatorEmail || null,
    program_coordinator_title: payload.programCoordinatorTitle || null,
    observaciones_alerta_rrc: payload.observacionesAlertaRrc || null,
    observaciones_alerta_acreditados: payload.observacionesAlertaAcreditados || null,
    source: "supabase",
  };
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const payload = (await request.json()) as ProgramRecord;

    const processCode = payload.processCode?.trim() ?? "";
    const faculty = payload.faculty?.trim() ?? "";
    const program = payload.program?.trim() ?? "";
    const degree = payload.degree?.trim() ?? "";

    if (!processCode || !faculty || !program || !degree) {
      return NextResponse.json(
        { error: "Codigo proceso, facultad, programa y titulo otorgado son obligatorios." },
        { status: 400 },
      );
    }

    if (!FACULTY_OPTIONS.has(faculty)) {
      return NextResponse.json({ error: "La facultad no pertenece al listado permitido." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("consolidado_programas")
      .insert(mapPayloadToInsert(payload))
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "CREATE",
      resource: "consolidado_programas",
      details: { id: data.id, program: payload.program },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown create error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

