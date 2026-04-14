import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ProgramRecord } from "@/components/consolidado/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const FACULTY_OPTIONS = new Set([
  "Facultad de Artes",
  "Facultad de Ciencias Agrarias",
  "Facultad de Ciencias Contables, Económicas u Administrativas",
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

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid program ID format" }, { status: 400 });
    }

    const payload = (await request.json()) as ProgramRecord;

    if (!FACULTY_OPTIONS.has(payload.faculty)) {
      return NextResponse.json({ error: "La facultad no pertenece al listado permitido." }, { status: 400 });
    }

    const client = getAdminClient();
    const updateData = {
      // Basic Program Information
      process_code: payload.processCode,
      faculty: payload.faculty,
      program: payload.program,
      degree: payload.degree || null,
      snies: payload.snies || null,

      // Administrative Details
      creation_agreement: payload.creationAgreement || null,
      no_renewal: payload.noRenewal || null,
      authorized_admissions_men: payload.authorizedAdmissionsMen || null,
      admission_periodicity: payload.admissionPeriodicity || null,
      agreement_code: payload.agreementCode || null,
      agreement_ies: payload.agreementIes || null,
      agreement_administrator: payload.agreementAdministrator || null,

      // Location and Format
      location: payload.location || null,
      workday: payload.workday || null,
      regionalized: payload.regionalized || false,
      level: payload.level || null,
      academic_level: payload.academicLevel || null,
      modality: payload.modality || null,
      methodology: payload.methodology || null,

      // Academic Credits
      research_credits: payload.researchCredits || null,
      deepening_credits: payload.deepeningCredits || null,
      total_academic_credits: payload.totalAcademicCredits || null,
      duration: payload.duration || null,

      // Reforms
      reform_academic_council: payload.reformAcademicCouncil || null,
      reform_superior_council: payload.reformSuperiorCouncil || null,
      reform_mineducacion: payload.reformMineducacion || null,
      tic_percentage: payload.ticPercentage || null,

      // Current R.C. (Registro de Calificación)
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

      // Graduates
      number_graduates: payload.numberGraduates || null,

      // Accreditation (A.A.C.)
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

      // Notes and Metadata
      accreditation_guideline: payload.accreditationGuideline || null,
      general_observations: payload.generalObservations || null,
      program_coordinator: payload.programCoordinator || null,
    };

    const { data, error } = await client
      .from("consolidado_programas")
      .update(updateData)
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
