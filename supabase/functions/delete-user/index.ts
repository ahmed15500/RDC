import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAIL = "ahmed.bahrawy@hu.edu.eg";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Delete-user function is missing Supabase environment variables." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await userClient.auth.getUser();

  if (callerError || !caller) {
    return jsonResponse({ error: "You must be logged in to delete users." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const callerEmail = caller.email?.trim().toLowerCase() || "";

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();

  if (callerProfileError) {
    return jsonResponse({ error: callerProfileError.message }, 500);
  }

  if (callerEmail !== ADMIN_EMAIL && callerProfile?.role !== "admin") {
    return jsonResponse({ error: "Only the RDC admin can delete users." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();

  if (!userId) {
    return jsonResponse({ error: "userId is required." }, 400);
  }

  if (userId === caller.id) {
    return jsonResponse({ error: "You cannot delete your own account while logged in." }, 400);
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", userId)
    .maybeSingle();

  if (targetProfileError) {
    return jsonResponse({ error: targetProfileError.message }, 500);
  }

  const targetEmail = targetProfile?.email?.trim().toLowerCase() || "";

  if (targetEmail === ADMIN_EMAIL || targetProfile?.role === "admin") {
    return jsonResponse({ error: "The protected RDC admin account cannot be deleted." }, 400);
  }

  if (!targetProfile) {
    return jsonResponse({ error: "User profile was not found." }, 404);
  }

  const { error: activitiesError } = await adminClient
    .from("activities")
    .update({ submitted_by_email: targetProfile.email, submitted_by: null })
    .eq("submitted_by", userId);

  if (activitiesError) {
    return jsonResponse({
      error: `Could not preserve the user's activity records: ${activitiesError.message}. Run migration 20260710_preserve_records_when_deleting_users.sql first.`,
    }, 500);
  }

  const { error: financialError } = await adminClient
    .from("financial_projects")
    .update({ created_by_email: targetProfile.email, created_by: null })
    .eq("created_by", userId);

  if (financialError && !String(financialError.message || "").toLowerCase().includes("financial_projects")) {
    return jsonResponse({
      error: `Could not preserve the user's financial records: ${financialError.message}. Run migration 20260710_preserve_records_when_deleting_users.sql first.`,
    }, 500);
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 400);
  }

  return jsonResponse({
    ok: true,
    deletedUserId: userId,
    email: targetProfile.email,
    preservedRecords: true,
  });
});
