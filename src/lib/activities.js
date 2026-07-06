import { supabase } from "./supabaseClient";
import { SDGS } from "../sampleData";

export const ADMIN_EMAIL = "ahmed.bahrawy@hu.edu.eg";

const numberFields = [
  "direct_beneficiaries",
  "indirect_beneficiaries",
  "households",
  "women",
  "women_trained",
  "youth",
  "children_students",
  "farmers",
  "schools",
  "teachers",
  "volunteers",
  "community_events",
  "trainings",
  "health_cases",
  "waste_collected_kg",
  "waste_recycled_kg",
  "waste_composted_kg",
];

function toNumber(value) {
  return Number(value || 0);
}

function selectedSdgObjects(sdgs = []) {
  return sdgs
    .map((number) => SDGS.find((sdg) => String(sdg.number) === String(number)) || { number, name: `SDG ${number}` })
    .filter(Boolean);
}

export async function signUp(email, password, profile = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: profile.name || "",
        department: profile.department || "",
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function ensureProfile(user, profile = {}) {
  if (!user) return null;
  const email = user.email?.toLowerCase() || "";
  const forcedAdmin = email === ADMIN_EMAIL;
  const { data: existing, error: existingError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existingError) throw existingError;
  if (existing && !forcedAdmin) return existing;

  const payload = {
    id: user.id,
    email: user.email,
    name: profile.name || user.user_metadata?.name || existing?.name || "",
    department: profile.department || user.user_metadata?.department || existing?.department || "",
    role: forcedAdmin ? "admin" : existing?.role || "viewer",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data || ensureProfile(user);
}

export async function listProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateProfileRole(userId, role) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitActivity(formData) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("User is not logged in");

  const insertPayload = {
    submitted_by: user.id,
    project_name: formData.projectName,
    activity_name: formData.activityName,
    activity_type: formData.activityType,
    village: formData.village === "Multiple Villages" ? (formData.selectedVillages || []).join(", ") : formData.village,
    date_period: formData.datePeriod,
    responsible_person: formData.responsiblePerson,
    partner: formData.partners,
    target_group: formData.targetGroup,
    objective: formData.objective,
    description: formData.description,
    direct_beneficiaries: toNumber(formData.directBeneficiaries),
    indirect_beneficiaries: toNumber(formData.indirectBeneficiaries),
    households: toNumber(formData.households),
    women: toNumber(formData.women),
    women_trained: toNumber(formData.womenTrained),
    youth: toNumber(formData.youth),
    children_students: toNumber(formData.childrenStudents),
    farmers: toNumber(formData.farmers),
    schools: toNumber(formData.schools),
    teachers: toNumber(formData.teachers),
    volunteers: toNumber(formData.volunteers),
    community_events: toNumber(formData.communityEvents),
    trainings: toNumber(formData.trainings),
    health_cases: toNumber(formData.healthCases),
    waste_collected_kg: toNumber(formData.wasteCollectedKg),
    waste_recycled_kg: toNumber(formData.wasteRecycledKg),
    waste_composted_kg: toNumber(formData.wasteCompostedKg),
    ecology_impact: formData.ecologyDescription,
    society_impact: formData.societyDescription,
    culture_impact: formData.cultureDescription,
    economy_impact: formData.economyDescription,
    sdgs: formData.sdgs,
    key_outcome: formData.keyOutcome,
    challenge: formData.challenge,
    success_story: formData.success || formData.testimonial,
    evidence_link: formData.driveLink || formData.photos || formData.reports || formData.otherEvidence,
    future_opportunity: formData.futureOpportunity,
    approval_status: "pending",
  };

  numberFields.forEach((field) => {
    insertPayload[field] = toNumber(insertPayload[field]);
  });

  const { data, error } = await supabase.from("activities").insert(insertPayload).select();
  if (error) throw error;
  return data;
}

export async function getApprovedActivities() {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAllActivities() {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export function mapSupabaseActivity(row) {
  const sdgNumbers = Array.isArray(row.sdgs) ? row.sdgs : [];
  const pillars = [
    row.ecology_impact ? "Ecology" : null,
    row.society_impact ? "Society" : null,
    row.culture_impact ? "Culture" : null,
    row.economy_impact ? "Economy" : null,
  ].filter(Boolean);

  return {
    id: row.id,
    projectName: row.project_name || "Untitled project",
    activityName: row.activity_name || "Untitled activity",
    activityType: row.activity_type || "Other",
    responsiblePerson: row.responsible_person || "",
    organization: row.organization || "Rural Development Center, Heliopolis University",
    partners: row.partner || "",
    villages: row.village ? row.village.split(",").map((village) => village.trim()).filter(Boolean) : [],
    datePeriod: row.date_period || "",
    targetGroup: row.target_group || "",
    objective: row.objective || "",
    description: row.description || "",
    metrics: {
      directBeneficiaries: toNumber(row.direct_beneficiaries),
      indirectBeneficiaries: toNumber(row.indirect_beneficiaries),
      households: toNumber(row.households),
      women: toNumber(row.women),
      womenTrained: toNumber(row.women_trained),
      youth: toNumber(row.youth),
      childrenStudents: toNumber(row.children_students),
      farmers: toNumber(row.farmers),
      schools: toNumber(row.schools),
      teachers: toNumber(row.teachers),
      volunteers: toNumber(row.volunteers),
      communityEvents: toNumber(row.community_events),
      trainings: toNumber(row.trainings),
      healthCases: toNumber(row.health_cases),
      wasteCollectedKg: toNumber(row.waste_collected_kg),
      wasteRecycledKg: toNumber(row.waste_recycled_kg),
      wasteCompostedKg: toNumber(row.waste_composted_kg),
      treesPlanted: toNumber(row.trees_planted),
      incomeGenerated: toNumber(row.income_generated),
      jobsCreated: toNumber(row.jobs_created),
      productsSold: toNumber(row.products_sold),
    },
    otherResults: "",
    pillars,
    pillarDescriptions: {
      Ecology: row.ecology_impact || "",
      Society: row.society_impact || "",
      Culture: row.culture_impact || "",
      Economy: row.economy_impact || "",
    },
    sdgs: selectedSdgObjects(sdgNumbers),
    qualitative: {
      keyOutcome: row.key_outcome || "",
      success: row.success_story || "",
      challenge: row.challenge || "",
      lessonsLearned: "",
      testimonial: row.success_story || "",
      beneficiaryQuote: "",
      beforeAfter: "",
      futureOpportunity: row.future_opportunity || "",
      supportNeeded: "",
    },
    evidence: row.evidence_link ? [{ type: "Evidence link", url: row.evidence_link, notes: "" }] : [],
    validation: {
      dataConfirmed: row.data_confirmed || "Needs review",
      submittedBy: row.submitted_by || "",
      submissionDate: row.created_at ? row.created_at.slice(0, 10) : "",
      dataSource: row.data_source || "",
      approvalStatus: normalizeApproval(row.approval_status),
      adminNotes: row.admin_notes || "",
    },
  };
}

function normalizeApproval(status) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "needs revision" || normalized === "needs_revision") return "Needs revision";
  if (normalized === "rejected") return "Rejected";
  return "Pending";
}
