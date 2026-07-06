import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAIL = "ahmed.bahrawy@hu.edu.eg";
const DEFAULT_APP_URL = "https://rdc-tau.vercel.app";

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

function resolveAppUrl() {
  const configuredUrl = (Deno.env.get("APP_URL") || DEFAULT_APP_URL).trim().replace(/\/$/, "");
  if (!configuredUrl || configuredUrl.includes("localhost") || configuredUrl.includes("127.0.0.1")) {
    return DEFAULT_APP_URL;
  }
  return configuredUrl;
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
  const defaultInvitePassword = Deno.env.get("DEFAULT_INVITE_PASSWORD");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Invite function is missing Supabase environment variables." }, 500);
  }

  if (!defaultInvitePassword) {
    return jsonResponse({ error: "Invite function is missing DEFAULT_INVITE_PASSWORD." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "You must be logged in to invite users." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const callerEmail = user.email?.toLowerCase() || "";

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: profileError.message }, 500);
  }

  if (callerEmail !== ADMIN_EMAIL && callerProfile?.role !== "admin") {
    return jsonResponse({ error: "Only the RDC admin can invite users." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const department = String(body.department || "").trim();

  if (!email || !email.includes("@")) {
    return jsonResponse({ error: "A valid email is required." }, 400);
  }

  const appUrl = resolveAppUrl();
  const userMetadata = {
    name,
    department,
    login_url: appUrl,
  };

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: appUrl,
    data: userMetadata,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  if (data.user?.id) {
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(data.user.id, {
      password: defaultInvitePassword,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (passwordError) {
      return jsonResponse({ error: passwordError.message }, 400);
    }

    await adminClient.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        name,
        department,
        role: email === ADMIN_EMAIL ? "admin" : "viewer",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  }

  return jsonResponse({
    ok: true,
    userId: data.user?.id || null,
    loginUrl: appUrl,
    email,
  });
});
