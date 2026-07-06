import React, { startTransition, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  Database,
  Download,
  FileText,
  Globe2,
  Home,
  Layers3,
  Leaf,
  LineChart,
  Lock,
  Map,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sprout,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ACTIVITY_TYPES, PILLARS, SDGS, TARGET_GROUPS, VILLAGES, seedActivities } from "./sampleData";
import { ADMIN_EMAIL, ensureProfile, getAllActivities, getApprovedActivities, getCurrentSession, listProfiles, mapSupabaseActivity, signIn, signOut, signUp, submitActivity, updateProfileRole } from "./lib/activities";
import rdcLogo from "./assets/heliopolis-rdc-logo.svg";
import "./styles.css";

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "submit", label: "Submit Data", icon: ClipboardCheck },
  { id: "admin", label: "Admin Dashboard", icon: BarChart3 },
  { id: "villages", label: "Village Dashboard", icon: Map },
  { id: "projects", label: "Project Dashboard", icon: Layers3 },
  { id: "pillars", label: "Pillar Dashboard", icon: Sprout },
  { id: "sdgs", label: "SDG Dashboard", icon: Globe2 },
  { id: "transformation", label: "Social Transformation", icon: Users },
  { id: "reports", label: "Reports / Export", icon: Download },
  { id: "data", label: "Data Management", icon: Database },
  { id: "users", label: "Users", icon: Users, adminOnly: true },
];

const pillarColors = {
  Ecology: "#1d9a69",
  Society: "#2474c6",
  Culture: "#e2a223",
  Economy: "#3d6d43",
};

const blankSubmission = {
  projectName: "",
  activityName: "",
  activityType: "Training / Workshop",
  responsiblePerson: "",
  organization: "",
  partners: "",
  village: "Galfina 1",
  datePeriod: "",
  targetGroup: "Women",
  objective: "",
  description: "",
  directBeneficiaries: 0,
  indirectBeneficiaries: 0,
  households: 0,
  women: 0,
  womenTrained: 0,
  youth: 0,
  childrenStudents: 0,
  farmers: 0,
  schools: 0,
  teachers: 0,
  volunteers: 0,
  communityEvents: 0,
  trainings: 0,
  healthCases: 0,
  wasteCollectedKg: 0,
  wasteRecycledKg: 0,
  wasteCompostedKg: 0,
  treesPlanted: 0,
  incomeGenerated: 0,
  jobsCreated: 0,
  productsSold: 0,
  otherResults: "",
  pillars: [],
  ecologyDescription: "",
  societyDescription: "",
  cultureDescription: "",
  economyDescription: "",
  sdgs: [],
  otherSdg: "",
  keyOutcome: "",
  success: "",
  challenge: "",
  lessonsLearned: "",
  testimonial: "",
  beneficiaryQuote: "",
  beforeAfter: "",
  futureOpportunity: "",
  supportNeeded: "",
  photos: "",
  videos: "",
  attendanceSheets: "",
  reports: "",
  beneficiaryLists: "",
  trainingMaterials: "",
  mediaCoverage: "",
  driveLink: "",
  otherEvidence: "",
  dataConfirmed: "Needs review",
  dataSource: "",
  submittedBy: "",
  submissionDate: new Date().toISOString().slice(0, 10),
  adminNotes: "",
  approvalStatus: "Pending",
};

const quantitativeFields = [
  ["directBeneficiaries", "Direct beneficiaries"],
  ["indirectBeneficiaries", "Indirect beneficiaries"],
  ["households", "Households reached"],
  ["women", "Women reached"],
  ["womenTrained", "Women trained"],
  ["youth", "Youth reached"],
  ["childrenStudents", "Children / students reached"],
  ["farmers", "Farmers reached"],
  ["schools", "Schools involved"],
  ["teachers", "Teachers involved"],
  ["volunteers", "Volunteers involved"],
  ["communityEvents", "Community events conducted"],
  ["trainings", "Training sessions conducted"],
  ["healthCases", "Health cases served"],
  ["wasteCollectedKg", "Waste collected in kg"],
  ["wasteRecycledKg", "Waste recycled in kg"],
  ["wasteCompostedKg", "Waste composted in kg"],
  ["treesPlanted", "Trees or plants planted"],
  ["incomeGenerated", "Income generated"],
  ["jobsCreated", "Jobs or income opportunities created"],
  ["productsSold", "Products produced or sold"],
];

const metricGroups = {
  "Basic reach": ["directBeneficiaries", "indirectBeneficiaries", "households"],
  "Women empowerment": ["women", "womenTrained", "incomeGenerated", "jobsCreated", "productsSold"],
  "Youth and education": ["youth", "childrenStudents", "schools", "teachers"],
  "Farmers and agriculture": ["farmers", "treesPlanted", "trainings"],
  "Health services": ["healthCases", "women", "childrenStudents", "volunteers"],
  "Waste and environment": ["wasteCollectedKg", "wasteRecycledKg", "wasteCompostedKg", "treesPlanted"],
  "Training and community": ["trainings", "communityEvents", "volunteers"],
  "Economy and livelihoods": ["incomeGenerated", "jobsCreated", "productsSold"],
};

const activityMetricDefaults = {
  "Waste Management": ["Basic reach", "Waste and environment", "Training and community"],
  "Waste for Food": ["Basic reach", "Waste and environment", "Farmers and agriculture", "Economy and livelihoods"],
  "Health / Physiotherapy Convoys": ["Basic reach", "Health services"],
  "Women Empowerment": ["Basic reach", "Women empowerment", "Training and community"],
  "Youth Development": ["Basic reach", "Youth and education", "Training and community"],
  "Summer Schools": ["Basic reach", "Youth and education", "Training and community"],
  "Arts for Climate": ["Basic reach", "Youth and education", "Waste and environment"],
  "Football Academy": ["Basic reach", "Youth and education"],
  "Farmer Support": ["Basic reach", "Farmers and agriculture", "Economy and livelihoods"],
  "Community Awareness": ["Basic reach", "Training and community"],
  "Training / Workshop": ["Basic reach", "Training and community"],
  "Research / Data Collection": ["Basic reach", "Training and community"],
  Other: ["Basic reach"],
};

const evidenceFields = [
  ["photos", "Photos"],
  ["videos", "Videos"],
  ["attendanceSheets", "Attendance sheets"],
  ["reports", "Reports"],
  ["beneficiaryLists", "Beneficiary lists"],
  ["trainingMaterials", "Training materials"],
  ["mediaCoverage", "Media coverage"],
  ["driveLink", "Google Drive folder link"],
  ["otherEvidence", "Other evidence links"],
];

function recommendedMetricGroups(activityType) {
  return activityMetricDefaults[activityType] || activityMetricDefaults.Other;
}

function roleToLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "stakeholder") return "Stakeholder / Project Officer";
  return "Viewer";
}

function labelToRole(label) {
  if (label === "Admin") return "admin";
  if (label === "Stakeholder / Project Officer") return "stakeholder";
  return "viewer";
}

function isAdminEmail(email) {
  return email?.toLowerCase() === ADMIN_EMAIL;
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item.metrics[key] || 0), 0);
}

function uniqueCount(items, selector) {
  return new Set(items.flatMap(selector).filter(Boolean)).size;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
}

function buildSummaries(activities) {
  const kpis = {
    villages: uniqueCount(activities, (a) => a.villages),
    activities: activities.length,
    direct: sum(activities, "directBeneficiaries"),
    indirect: sum(activities, "indirectBeneficiaries"),
    households: sum(activities, "households"),
    women: sum(activities, "women"),
    youth: sum(activities, "youth"),
    children: sum(activities, "childrenStudents"),
    farmers: sum(activities, "farmers"),
    schools: sum(activities, "schools"),
    volunteers: sum(activities, "volunteers"),
    healthCases: sum(activities, "healthCases"),
    wasteCollected: sum(activities, "wasteCollectedKg"),
    wasteRecycled: sum(activities, "wasteRecycledKg"),
    wasteComposted: sum(activities, "wasteCompostedKg"),
    trainings: sum(activities, "trainings"),
    events: sum(activities, "communityEvents"),
  };

  const byVillage = VILLAGES.filter((v) => !["Other", "Multiple Villages"].includes(v)).map((village) => {
    const rows = activities.filter((a) => a.villages.includes(village));
    return {
      village,
      activities: rows.length,
      beneficiaries: sum(rows, "directBeneficiaries") + sum(rows, "indirectBeneficiaries"),
      projects: [...new Set(rows.map((r) => r.projectName))],
      pillars: [...new Set(rows.flatMap((r) => r.pillars))],
      sdgs: [...new Set(rows.flatMap((r) => r.sdgs.map((s) => s.number)))],
      outcomes: rows.map((r) => r.qualitative.keyOutcome).filter(Boolean).slice(0, 3),
      challenges: rows.map((r) => r.qualitative.challenge).filter(Boolean).slice(0, 2),
      evidence: rows.flatMap((r) => r.evidence).slice(0, 2),
    };
  });

  const byProject = ACTIVITY_TYPES.map((type) => {
    const rows = activities.filter((a) => a.activityType === type);
    return {
      type,
      activities: rows.length,
      beneficiaries: sum(rows, "directBeneficiaries") + sum(rows, "indirectBeneficiaries"),
      villages: [...new Set(rows.flatMap((r) => r.villages))],
      targetGroups: [...new Set(rows.map((r) => r.targetGroup))],
      pillars: [...new Set(rows.flatMap((r) => r.pillars))],
      sdgs: [...new Set(rows.flatMap((r) => r.sdgs.map((s) => s.number)))],
      outcomes: rows.map((r) => r.qualitative.keyOutcome).filter(Boolean),
      challenges: rows.map((r) => r.qualitative.challenge).filter(Boolean),
      opportunities: rows.map((r) => r.qualitative.futureOpportunity).filter(Boolean),
    };
  }).filter((row) => row.activities > 0);

  const byPillar = PILLARS.map((pillar) => {
    const rows = activities.filter((a) => a.pillars.includes(pillar));
    return {
      pillar,
      activities: rows.length,
      beneficiaries: sum(rows, "directBeneficiaries") + sum(rows, "indirectBeneficiaries"),
      projects: uniqueCount(rows, (a) => [a.projectName]),
      villages: uniqueCount(rows, (a) => a.villages),
      waste: sum(rows, "wasteCollectedKg") + sum(rows, "wasteRecycledKg") + sum(rows, "wasteCompostedKg"),
      trainings: sum(rows, "trainings"),
      income: sum(rows, "incomeGenerated"),
      outcomes: rows.map((r) => r.qualitative.keyOutcome).filter(Boolean).slice(0, 4),
    };
  });

  const bySdg = SDGS.map((sdg) => {
    const rows = activities.filter((a) => a.sdgs.some((s) => s.number === sdg.number));
    return {
      ...sdg,
      activities: rows.length,
      beneficiaries: sum(rows, "directBeneficiaries") + sum(rows, "indirectBeneficiaries"),
      projects: [...new Set(rows.map((r) => r.projectName))],
      villages: [...new Set(rows.flatMap((r) => r.villages))],
    };
  }).filter((row) => row.activities > 0);

  return { kpis, byVillage, byProject, byPillar, bySdg };
}

function exportCsv(activities) {
  const headers = [
    "Project",
    "Activity",
    "Type",
    "Villages",
    "Date",
    "Target Group",
    "Direct Beneficiaries",
    "Indirect Beneficiaries",
    "Pillars",
    "SDGs",
    "Approval",
  ];
  const rows = activities.map((a) => [
    a.projectName,
    a.activityName,
    a.activityType,
    a.villages.join("; "),
    a.datePeriod,
    a.targetGroup,
    a.metrics.directBeneficiaries,
    a.metrics.indirectBeneficiaries,
    a.pillars.join("; "),
    a.sdgs.map((s) => `SDG ${s.number}`).join("; "),
    a.validation.approvalStatus,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "rdc-impact-data.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState("Viewer");
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeView, setActiveView] = useState("home");
  const [language, setLanguage] = useState("EN");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [appMessage, setAppMessage] = useState("");
  const [filters, setFilters] = useState({ query: "", village: "All", pillar: "All", sdg: "All", targetGroup: "All", status: "All" });
  const [editingActivity, setEditingActivity] = useState(null);
  const summaries = useMemo(() => buildSummaries(activities), [activities]);

  useEffect(() => {
    let active = true;
    getCurrentSession()
      .then((currentSession) => {
        if (!active) return;
        setSession(currentSession);
        if (isAdminEmail(currentSession?.user?.email)) setRole("Admin");
        if (currentSession) initializeUser(currentSession.user);
      })
      .catch((error) => setAppMessage(error.message))
      .finally(() => active && setAuthLoading(false));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (session) refreshActivities(role);
    if (session && role === "Admin") refreshProfiles();
  }, [role, session]);

  async function initializeUser(user) {
    const adminByEmail = isAdminEmail(user?.email);
    if (adminByEmail) {
      setRole("Admin");
      await refreshActivities("Admin");
      await refreshProfiles();
    }
    try {
      const nextProfile = await ensureProfile(user);
      const nextRole = adminByEmail ? "Admin" : roleToLabel(nextProfile?.role);
      setProfile(nextProfile);
      setRole(nextRole);
      if (!adminByEmail) await refreshActivities(nextRole);
      if (nextRole === "Admin") await refreshProfiles();
    } catch (error) {
      if (adminByEmail) {
        setAppMessage(`Admin login active. Profile sync failed: ${error.message}`);
        return;
      }
      throw error;
    }
  }

  const filteredActivities = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return activities.filter((a) => {
      const matchesQuery = !query || [a.projectName, a.activityName, a.activityType, a.targetGroup, a.responsiblePerson].join(" ").toLowerCase().includes(query);
      const matchesVillage = filters.village === "All" || a.villages.includes(filters.village);
      const matchesPillar = filters.pillar === "All" || a.pillars.includes(filters.pillar);
      const matchesSdg = filters.sdg === "All" || a.sdgs.some((s) => String(s.number) === filters.sdg);
      const matchesTarget = filters.targetGroup === "All" || a.targetGroup === filters.targetGroup;
      const matchesStatus = filters.status === "All" || a.validation.approvalStatus === filters.status;
      return matchesQuery && matchesVillage && matchesPillar && matchesSdg && matchesTarget && matchesStatus;
    });
  }, [activities, filters]);

  async function refreshActivities(currentRole = role) {
    setDataLoading(true);
    try {
      const rows = currentRole === "Admin" ? await getAllActivities() : await getApprovedActivities();
      const mapped = rows.map(mapSupabaseActivity);
      setActivities(mapped);
      setAppMessage(mapped.length ? "Dashboard data loaded from Supabase." : "No Supabase rows found yet. The dashboard is empty until new activities are submitted or approved.");
    } catch (error) {
      setActivities([]);
      setAppMessage(`Supabase read failed: ${error.message}. No sample data was loaded.`);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleLogin(email, password) {
    const { session: nextSession } = await signIn(email, password);
    setSession(nextSession);
    await initializeUser(nextSession.user);
    setAppMessage("Logged in with Supabase.");
  }

  async function handleSignup(email, password, signupProfile) {
    const { session: nextSession, user } = await signUp(email, password, signupProfile);
    setSession(nextSession);
    setAppMessage(nextSession ? "Account created and logged in." : "Account created. Check email confirmation if required by Supabase.");
    if (nextSession) {
      await initializeUser(nextSession.user);
    } else if (user) {
      setRole("Viewer");
    }
  }

  async function refreshProfiles() {
    try {
      setProfiles(await listProfiles());
    } catch (error) {
      setAppMessage(`User list failed: ${error.message}`);
    }
  }

  async function handlePromoteUser(userId, nextRole) {
    await updateProfileRole(userId, nextRole);
    await refreshProfiles();
    setAppMessage("User role updated.");
  }

  async function handleLogout() {
    await signOut();
    setSession(null);
    setProfile(null);
    setProfiles([]);
    setRole("Viewer");
    setActivities([]);
    setActiveView("home");
    setAppMessage("");
  }

  async function addSubmission(payload) {
    const sdgObjects = payload.sdgs.map((number) => SDGS.find((s) => String(s.number) === String(number))).filter(Boolean);
    if (payload.otherSdg) sdgObjects.push({ number: "Other", name: payload.otherSdg });
    const activity = {
      id: editingActivity?.id || crypto.randomUUID(),
      projectName: payload.projectName || "Untitled RDC Project",
      activityName: payload.activityName || "New stakeholder submission",
      activityType: payload.activityType,
      responsiblePerson: payload.responsiblePerson,
      organization: payload.organization,
      partners: payload.partners,
      villages: payload.village === "Multiple Villages" ? ["Multiple Villages"] : [payload.village],
      datePeriod: payload.datePeriod,
      targetGroup: payload.targetGroup,
      objective: payload.objective,
      description: payload.description,
      metrics: {
        directBeneficiaries: Number(payload.directBeneficiaries),
        indirectBeneficiaries: Number(payload.indirectBeneficiaries),
        households: Number(payload.households),
        women: Number(payload.women),
        womenTrained: Number(payload.womenTrained),
        youth: Number(payload.youth),
        childrenStudents: Number(payload.childrenStudents),
        farmers: Number(payload.farmers),
        schools: Number(payload.schools),
        teachers: Number(payload.teachers),
        volunteers: Number(payload.volunteers),
        communityEvents: Number(payload.communityEvents),
        trainings: Number(payload.trainings),
        healthCases: Number(payload.healthCases),
        wasteCollectedKg: Number(payload.wasteCollectedKg),
        wasteRecycledKg: Number(payload.wasteRecycledKg),
        wasteCompostedKg: Number(payload.wasteCompostedKg),
        treesPlanted: Number(payload.treesPlanted),
        incomeGenerated: Number(payload.incomeGenerated),
        jobsCreated: Number(payload.jobsCreated),
        productsSold: Number(payload.productsSold),
      },
      otherResults: payload.otherResults,
      pillars: payload.pillars,
      pillarDescriptions: {
        Ecology: payload.ecologyDescription,
        Society: payload.societyDescription,
        Culture: payload.cultureDescription,
        Economy: payload.economyDescription,
      },
      sdgs: sdgObjects,
      qualitative: {
        keyOutcome: payload.keyOutcome,
        success: payload.success,
        challenge: payload.challenge,
        lessonsLearned: payload.lessonsLearned,
        testimonial: payload.testimonial,
        beneficiaryQuote: payload.beneficiaryQuote,
        beforeAfter: payload.beforeAfter,
        futureOpportunity: payload.futureOpportunity,
        supportNeeded: payload.supportNeeded,
      },
      evidence: [
        ["Photos", payload.photos],
        ["Videos", payload.videos],
        ["Attendance sheets", payload.attendanceSheets],
        ["Reports", payload.reports],
        ["Beneficiary lists", payload.beneficiaryLists],
        ["Training materials", payload.trainingMaterials],
        ["Media coverage", payload.mediaCoverage],
        ["Google Drive folder", payload.driveLink],
        ["Other", payload.otherEvidence],
      ].filter((entry) => entry[1]).map(([type, url]) => ({ type, url, notes: "" })),
      validation: {
        dataConfirmed: payload.dataConfirmed,
        dataSource: payload.dataSource,
        submittedBy: payload.submittedBy,
        submissionDate: payload.submissionDate,
        adminNotes: payload.adminNotes,
        approvalStatus: payload.approvalStatus,
      },
    };
    setAppMessage("");
    if (!editingActivity) {
      await submitActivity(payload);
      setAppMessage("Activity submitted to Supabase. It will appear in approved dashboards after approval_status is approved.");
    }
    setActivities((current) => editingActivity ? current.map((item) => item.id === editingActivity.id ? activity : item) : [activity, ...current]);
    setEditingActivity(null);
    setActiveView(role === "Admin" ? "data" : "submit");
  }

  function updateApproval(id, approvalStatus) {
    setActivities((current) => current.map((a) => a.id === id ? { ...a, validation: { ...a.validation, approvalStatus } } : a));
  }

  function deleteActivity(id) {
    setActivities((current) => current.filter((a) => a.id !== id));
  }

  if (authLoading) return <LoadingScreen message="Checking Supabase session..." />;
  if (!session) return <SupabaseLoginPage onLogin={handleLogin} onSignup={handleSignup} message={appMessage} />;

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`} dir={language === "AR" ? "rtl" : "ltr"}>
      <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src={rdcLogo} alt="Heliopolis University Rural Development Center logo" />
          <div>
            <strong>RDC Impact</strong>
            <span>Heliopolis University</span>
          </div>
          <button className="sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <nav>
          {navItems.filter((item) => !item.adminOnly || role === "Admin").map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={activeView === item.id ? "active" : ""} onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <button className="menu-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={18} /> Menu</button>
            <h1>{navItems.find((item) => item.id === activeView)?.label || "RDC Impact"}</h1>
            <p>Integrated rural social transformation across 13 villages.</p>
          </div>
          <div className="top-actions">
            <div className="searchbox"><Search size={16} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search activities, projects, people" /></div>
            <span className="role-pill">{role}</span>
            <button className="ghost" onClick={() => setLanguage(language === "EN" ? "AR" : "EN")}>{language}</button>
            <button className="ghost" onClick={() => refreshActivities(role)} disabled={dataLoading}>{dataLoading ? "Loading..." : "Refresh"}</button>
            <button className="ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        {appMessage && <div className="app-message">{appMessage}</div>}
        <RoleNotice role={role} />

        {activeView === "home" && <HomeView summaries={summaries} setActiveView={setActiveView} loadDemoData={() => { setActivities(seedActivities); setAppMessage("Demo sample data loaded locally. Refresh from Supabase to clear it."); }} />}
        {activeView === "submit" && <SubmissionForm onSubmit={addSubmission} initial={editingActivity} role={role} />}
        {activeView === "admin" && <AdminDashboard summaries={summaries} activities={filteredActivities} updateApproval={updateApproval} role={role} />}
        {activeView === "villages" && <VillageDashboard summaries={summaries} />}
        {activeView === "projects" && <ProjectDashboard summaries={summaries} />}
        {activeView === "pillars" && <PillarDashboard summaries={summaries} />}
        {activeView === "sdgs" && <SdgDashboard summaries={summaries} />}
        {activeView === "transformation" && <TransformationDashboard summaries={summaries} activities={activities} />}
        {activeView === "reports" && <ReportsPage summaries={summaries} activities={activities} onExport={() => exportCsv(activities)} />}
        {activeView === "data" && (
          <DataManagement
            activities={filteredActivities}
            filters={filters}
            setFilters={(next) => startTransition(() => setFilters(next))}
            role={role}
            onEdit={(activity) => { setEditingActivity(activity); setActiveView("submit"); }}
            onDelete={deleteActivity}
            updateApproval={updateApproval}
            profiles={profiles}
            onRoleChange={handlePromoteUser}
          />
        )}
        {activeView === "users" && role === "Admin" && <UserManagement profiles={profiles} onRoleChange={handlePromoteUser} onRefresh={refreshProfiles} />}
        {activeView === "users" && role !== "Admin" && <article className="panel"><h3>Admin only</h3><p className="summary-text">Only Ahmed Bahrawy can manage user permissions.</p></article>}
      </main>
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <main className="login-page single">
      <section className="login-card">
        <img className="login-logo" src={rdcLogo} alt="Heliopolis University Rural Development Center logo" />
        <h1>{message}</h1>
      </section>
    </main>
  );
}

function SupabaseLoginPage({ onLogin, onSignup, message }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setAuthError("");
    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await onLogin(email, password);
      } else {
        if (!department) {
          setAuthError("Department is required for new users.");
          setLoading(false);
          return;
        }
        await onSignup(email, password, { name, department });
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img className="login-logo" src={rdcLogo} alt="Heliopolis University Rural Development Center logo" />
        <h1>RDC Impact Data Platform</h1>
        <p>Collect, validate, summarize, and visualize the full social transformation impact of RDC's 13-village model.</p>
        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
        </div>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {mode === "signup" && <Field label="Full name" value={name} onChange={setName} />}
        {mode === "signup" && <Field label="Department / organization" value={department} onChange={setDepartment} />}
        <div className="auth-info">New users enter as Viewer. Ahmed Bahrawy is the only Admin and can promote users for data entry.</div>
        {(authError || message) && <div className={authError ? "auth-error" : "auth-info"}>{authError || message}</div>}
        <button className="primary full" disabled={loading}><Lock size={16} /> {loading ? "Please wait..." : mode === "login" ? "Login to dashboard" : "Create account"}</button>
        <small>Authentication uses Supabase email and password. The frontend uses only the publishable key.</small>
      </form>
      <section className="login-visual">
        <h2>Four sustainability pillars, one integrated evidence system.</h2>
        <div className="pillar-orbit">{PILLARS.map((pillar) => <span key={pillar} style={{ "--pillar": pillarColors[pillar] }}>{pillar}</span>)}</div>
      </section>
    </main>
  );
}

function LegacyLoginPage({ role, setRole, onLogin }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <img className="login-logo" src={rdcLogo} alt="Heliopolis University Rural Development Center logo" />
        <h1>RDC Impact Data Platform</h1>
        <p>Collect, validate, summarize, and visualize the full social transformation impact of RDC’s 13-village model.</p>
        <label>Email<input type="email" defaultValue="admin@rdc-heliopolis.edu" /></label>
        <label>Password<input type="password" defaultValue="rdc-demo" /></label>
        <label>Role<select value={role} onChange={(event) => setRole(event.target.value)}>{["Admin", "Stakeholder / Project Officer", "Viewer"].map((r) => <option key={r}>{r}</option>)}</select></label>
        <button className="primary full" onClick={onLogin}><Lock size={16} /> Login to dashboard</button>
        <small>Demo login is local-only. Replace with real authentication when connecting a backend.</small>
      </section>
      <section className="login-visual">
        <h2>Four sustainability pillars, one integrated evidence system.</h2>
        <div className="pillar-orbit">{PILLARS.map((pillar) => <span key={pillar} style={{ "--pillar": pillarColors[pillar] }}>{pillar}</span>)}</div>
      </section>
    </main>
  );
}

function RoleNotice({ role }) {
  const text = {
    Admin: "Admin access: view, validate, edit, delete, export, and analyze all submitted data.",
    "Stakeholder / Project Officer": "Stakeholder access: submit RDC activity data after Admin approval.",
    Viewer: "Viewer access: dashboard and report viewing only. Ahmed Bahrawy can promote Viewers to Stakeholder.",
  }[role];
  return <div className="role-notice"><ShieldCheck size={16} />{text}</div>;
}

function HomeView({ summaries, setActiveView, loadDemoData }) {
  return (
    <section className="grid two">
      <div className="hero-panel">
        <h2>RDC 13-village social transformation evidence hub</h2>
        <p>This tool organizes field activities into a single data model covering villages, projects, pillars, SDGs, target groups, qualitative outcomes, evidence, and validation status.</p>
        <div className="button-row">
          <button className="primary" onClick={() => setActiveView("submit")}>Submit stakeholder data</button>
          <button className="secondary" onClick={() => setActiveView("admin")}>Open analytics</button>
          <button className="secondary" onClick={loadDemoData}>Load demo sample data</button>
        </div>
      </div>
      <div className="model-card">
        <h3>Database Structure</h3>
        {["Users", "Villages", "Projects", "Activities", "Impact_Data", "Pillar_Impact", "SDG_Mapping", "Qualitative_Impact", "Evidence", "Validation"].map((table) => <span key={table}>{table}</span>)}
      </div>
      <KpiGrid summaries={summaries} />
    </section>
  );
}

function KpiGrid({ summaries }) {
  const cards = [
    ["Total villages reached", summaries.kpis.villages],
    ["Total activities", summaries.kpis.activities],
    ["Direct beneficiaries", summaries.kpis.direct],
    ["Indirect beneficiaries", summaries.kpis.indirect],
    ["Households reached", summaries.kpis.households],
    ["Women supported", summaries.kpis.women],
    ["Youth reached", summaries.kpis.youth],
    ["Children/students", summaries.kpis.children],
    ["Farmers reached", summaries.kpis.farmers],
    ["Schools involved", summaries.kpis.schools],
    ["Volunteers", summaries.kpis.volunteers],
    ["Health cases served", summaries.kpis.healthCases],
    ["Waste collected kg", summaries.kpis.wasteCollected],
    ["Waste recycled kg", summaries.kpis.wasteRecycled],
    ["Waste composted kg", summaries.kpis.wasteComposted],
    ["Trainings/workshops", summaries.kpis.trainings],
    ["Community events", summaries.kpis.events],
  ];
  return <div className="kpi-grid wide">{cards.map(([label, value]) => <article className="kpi-card" key={label}><span>{label}</span><strong>{formatNumber(value)}</strong></article>)}</div>;
}

function AdminDashboard({ summaries, activities, updateApproval, role }) {
  return (
    <section className="stack">
      <KpiGrid summaries={summaries} />
      <div className="grid two">
        <ChartPanel title="Beneficiaries by village">
          <ResponsiveContainer width="100%" height={310}><BarChart data={summaries.byVillage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="village" angle={-25} textAnchor="end" height={100} /><YAxis /><Tooltip /><Bar dataKey="beneficiaries" fill="#2474c6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Activities by sustainability pillar">
          <ResponsiveContainer width="100%" height={310}><PieChart><Pie data={summaries.byPillar} dataKey="activities" nameKey="pillar" outerRadius={110} label>{summaries.byPillar.map((row) => <Cell key={row.pillar} fill={pillarColors[row.pillar]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
        </ChartPanel>
      </div>
      <ApprovalTable activities={activities} updateApproval={updateApproval} role={role} />
    </section>
  );
}

function ChartPanel({ title, children }) {
  return <article className="panel"><h3>{title}</h3>{children}</article>;
}

function ApprovalTable({ activities, updateApproval, role }) {
  return (
    <article className="panel">
      <h3>Admin review and approval</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Activity</th><th>Village</th><th>Pillars</th><th>Submitted by</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {activities.map((activity) => <tr key={activity.id}>
              <td><strong>{activity.activityName}</strong><small>{activity.projectName}</small></td>
              <td>{activity.villages.join(", ")}</td>
              <td>{activity.pillars.map((p) => <span className="chip" key={p} style={{ "--chip": pillarColors[p] }}>{p}</span>)}</td>
              <td>{activity.validation.submittedBy}</td>
              <td><span className={`status ${activity.validation.approvalStatus.toLowerCase().replace(" ", "-")}`}>{activity.validation.approvalStatus}</span></td>
              <td><select disabled={role !== "Admin"} value={activity.validation.approvalStatus} onChange={(event) => updateApproval(activity.id, event.target.value)}><option>Pending</option><option>Approved</option><option>Needs revision</option><option>Rejected</option></select></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function VillageDashboard({ summaries }) {
  return (
    <section className="stack">
      <div className="grid two">
        <ChartPanel title="Activities by village"><ResponsiveContainer width="100%" height={300}><BarChart data={summaries.byVillage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="village" hide /><YAxis /><Tooltip /><Bar dataKey="activities" fill="#1d9a69" /></BarChart></ResponsiveContainer></ChartPanel>
        <ChartPanel title="Pillar coverage by village"><ResponsiveContainer width="100%" height={300}><BarChart data={summaries.byVillage}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="village" hide /><YAxis /><Tooltip /><Bar dataKey={(row) => row.pillars.length} name="Pillars covered" fill="#e2a223" /></BarChart></ResponsiveContainer></ChartPanel>
      </div>
      <div className="village-grid">{summaries.byVillage.map((v) => <article className="panel village-card" key={v.village}><h3>{v.village}</h3><p><strong>{v.activities}</strong> activities · <strong>{formatNumber(v.beneficiaries)}</strong> beneficiaries</p><p>Projects: {v.projects.join(", ") || "No sample records yet"}</p><p>Pillars: {v.pillars.join(", ") || "None"}</p><p>SDGs: {v.sdgs.join(", ") || "None"}</p><p>Main outcomes: {v.outcomes.join(" | ") || "Pending field data"}</p><p>Challenges: {v.challenges.join(" | ") || "Pending validation"}</p></article>)}</div>
    </section>
  );
}

function ProjectDashboard({ summaries }) {
  return <section className="project-list">{summaries.byProject.map((p) => <article className="panel project-row" key={p.type}><div><h3>{p.type}</h3><p>{p.activities} activities · {formatNumber(p.beneficiaries)} beneficiaries · {p.villages.length} villages</p></div><div><strong>Target groups</strong><p>{p.targetGroups.join(", ")}</p></div><div><strong>Pillars</strong><p>{p.pillars.join(", ")}</p></div><div><strong>Future opportunities</strong><p>{p.opportunities.slice(0, 2).join(" | ") || "To be defined"}</p></div></article>)}</section>;
}

function PillarDashboard({ summaries }) {
  const descriptions = {
    Ecology: "Waste reduction, recycling, composting, environmental education, climate awareness, sustainable agriculture, and natural resource protection.",
    Society: "Health access, education, women, youth, children, inclusion, participation, and well-being.",
    Culture: "Arts, storytelling, school culture, local identity, community learning, and creative awareness.",
    Economy: "Income generation, employability, vocational training, local production, women’s economic empowerment, and cost-saving solutions.",
  };
  return (
    <section className="stack">
      <div className="grid two">
        <ChartPanel title="Beneficiaries by pillar"><ResponsiveContainer width="100%" height={300}><BarChart data={summaries.byPillar}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="pillar" /><YAxis /><Tooltip /><Bar dataKey="beneficiaries">{summaries.byPillar.map((row) => <Cell key={row.pillar} fill={pillarColors[row.pillar]} />)}</Bar></BarChart></ResponsiveContainer></ChartPanel>
        <ChartPanel title="Villages covered by pillar"><ResponsiveContainer width="100%" height={300}><BarChart data={summaries.byPillar}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="pillar" /><YAxis /><Tooltip /><Bar dataKey="villages">{summaries.byPillar.map((row) => <Cell key={row.pillar} fill={pillarColors[row.pillar]} />)}</Bar></BarChart></ResponsiveContainer></ChartPanel>
      </div>
      <div className="grid four">{summaries.byPillar.map((p) => <article className="pillar-card" key={p.pillar} style={{ "--pillar": pillarColors[p.pillar] }}><h3>{p.pillar}</h3><p>{descriptions[p.pillar]}</p><strong>{p.activities} activities</strong><span>{formatNumber(p.beneficiaries)} beneficiaries</span><span>{p.projects} projects · {p.villages} villages</span><p>{p.outcomes.join(" | ")}</p></article>)}</div>
    </section>
  );
}

function SdgDashboard({ summaries }) {
  return (
    <section className="stack">
      <ChartPanel title="Number of activities per SDG"><ResponsiveContainer width="100%" height={320}><BarChart data={summaries.bySdg}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="number" /><YAxis /><Tooltip /><Bar dataKey="activities" fill="#345f48" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></ChartPanel>
      <article className="panel"><h3>SDG contribution matrix</h3><div className="sdg-matrix">{summaries.bySdg.map((sdg) => <div key={sdg.number}><strong>SDG {sdg.number}</strong><span>{sdg.name}</span><b>{sdg.activities} activities</b><small>{formatNumber(sdg.beneficiaries)} beneficiaries</small><em>{sdg.villages.slice(0, 4).join(", ")}</em></div>)}</div></article>
    </section>
  );
}

function TransformationDashboard({ summaries, activities }) {
  const areas = ["Education", "Health", "Environment", "Women empowerment", "Youth development", "Culture", "Economy", "Community participation", "Research and knowledge"];
  const narrative = `Across ${summaries.kpis.villages} villages, RDC connects ${summaries.kpis.activities} activities into a single rural transformation model. Education, health, environment, women empowerment, youth development, culture, economy, community participation, and research are not treated as isolated projects. They reinforce each other through shared villages, repeated target groups, partner evidence, and SDG alignment. The current sample dataset records ${formatNumber(summaries.kpis.direct + summaries.kpis.indirect)} total direct and indirect beneficiaries, ${formatNumber(summaries.kpis.women)} women supported, ${formatNumber(summaries.kpis.youth)} youth reached, and ${formatNumber(summaries.kpis.wasteRecycled + summaries.kpis.wasteComposted)} kg of recycled or composted waste. This creates a practical evidence base for Sustainability Week, SDGI Conference, donor reporting, monitoring, and strategic planning.`;
  return (
    <section className="stack">
      <article className="transformation-panel"><h2>Full Social Transformation Model</h2><p>{narrative}</p><div className="transformation-map">{areas.map((area, index) => <span key={area} style={{ "--delay": `${index * 40}ms` }}>{area}</span>)}</div></article>
      <div className="grid two"><ChartPanel title="Projects by pillar"><ResponsiveContainer width="100%" height={300}><BarChart data={summaries.byPillar}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="pillar" /><YAxis /><Tooltip /><Bar dataKey="projects" fill="#3d6d43" /></BarChart></ResponsiveContainer></ChartPanel><article className="panel"><h3>Representative human stories</h3>{activities.slice(0, 5).map((a) => <blockquote key={a.id}>{a.qualitative.testimonial || a.qualitative.beneficiaryQuote}<cite>{a.activityName}</cite></blockquote>)}</article></div>
    </section>
  );
}

function ReportsPage({ summaries, activities, onExport }) {
  const reportTypes = ["Excel file of all data", "PDF impact report", "Village-level report", "Project-level report", "SDG mapping report", "Sustainability pillars report", "Conference summary", "Sustainability Week exhibition summary"];
  const summary = `RDC reached ${summaries.kpis.villages} villages through ${summaries.kpis.activities} recorded activities, serving ${formatNumber(summaries.kpis.direct)} direct beneficiaries and ${formatNumber(summaries.kpis.indirect)} indirect beneficiaries. The evidence base shows contribution across Ecology, Society, Culture, and Economy, with strong links to ${summaries.bySdg.length} SDGs and ${formatNumber(summaries.kpis.trainings)} trainings or workshops.`;
  return <section className="grid two"><article className="panel"><h3>Auto-written executive summary</h3><p className="summary-text">{summary}</p><button className="primary" onClick={onExport}>Export Excel-compatible CSV</button><button className="secondary" onClick={() => window.print()}>Export PDF / print report</button></article><article className="panel"><h3>Report formats</h3>{reportTypes.map((type) => <div className="report-row" key={type}><FileText size={18} /><span>{type}</span><button onClick={type.includes("Excel") ? onExport : () => window.print()}>Generate</button></div>)}<small>{activities.length} activities included in current report dataset.</small></article></section>;
}

function DataManagement({ activities, filters, setFilters, role, onEdit, onDelete, updateApproval }) {
  return (
    <section className="stack">
      <article className="filters panel"><select value={filters.village} onChange={(e) => setFilters({ ...filters, village: e.target.value })}><option>All</option>{VILLAGES.map((v) => <option key={v}>{v}</option>)}</select><select value={filters.pillar} onChange={(e) => setFilters({ ...filters, pillar: e.target.value })}><option>All</option>{PILLARS.map((p) => <option key={p}>{p}</option>)}</select><select value={filters.sdg} onChange={(e) => setFilters({ ...filters, sdg: e.target.value })}><option>All</option>{SDGS.map((s) => <option key={s.number} value={s.number}>SDG {s.number}</option>)}</select><select value={filters.targetGroup} onChange={(e) => setFilters({ ...filters, targetGroup: e.target.value })}><option>All</option>{TARGET_GROUPS.map((t) => <option key={t}>{t}</option>)}</select><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option>All</option><option>Pending</option><option>Approved</option><option>Needs revision</option><option>Rejected</option></select></article>
      <ApprovalTable activities={activities} updateApproval={updateApproval} role={role} />
      <div className="data-actions">{activities.map((a) => <article className="panel data-card" key={a.id}><h3>{a.activityName}</h3><p>{a.description}</p><p>{a.evidence.map((e) => `${e.type}: ${e.url}`).join(" | ")}</p><button disabled={role === "Viewer"} onClick={() => onEdit(a)}>Edit</button><button className="danger" disabled={role !== "Admin"} onClick={() => onDelete(a.id)}>Delete</button></article>)}</div>
    </section>
  );
}

function UserManagement({ profiles, onRoleChange, onRefresh }) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <h3>User permissions</h3>
        <button className="secondary" onClick={onRefresh}>Refresh users</button>
      </div>
      <p className="summary-text">New users enter as Viewer. Promote only trusted project officers to Stakeholder so they can submit activity data.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Department</th><th>Current role</th><th>Permission</th></tr></thead>
          <tbody>
            {!profiles.length && <tr><td colSpan="4">No user profiles found yet. Users appear here after they sign up and confirm/login.</td></tr>}
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td><strong>{profile.name || "Unnamed user"}</strong><small>{profile.email}</small></td>
                <td>{profile.department || "Not provided"}</td>
                <td><span className="status">{roleToLabel(profile.role)}</span></td>
                <td>
                  {profile.role === "admin" ? (
                    <span className="role-lock">Only admin</span>
                  ) : (
                    <select value={profile.role} onChange={(event) => onRoleChange(profile.id, event.target.value)}>
                      <option value="viewer">Viewer</option>
                      <option value="stakeholder">Stakeholder / Project Officer</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function SubmissionForm({ onSubmit, initial, role }) {
  const initialForm = useMemo(() => initial ? activityToForm(initial) : blankSubmission, [initial]);
  const [form, setForm] = useState(initialForm);
  const [selectedMetricGroups, setSelectedMetricGroups] = useState(() => recommendedMetricGroups(initial?.activityType || blankSubmission.activityType));
  const [selectedEvidenceFields, setSelectedEvidenceFields] = useState(() => evidenceFields.filter(([key]) => initialForm[key]).map(([key]) => key));
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const disabled = role === "Viewer";
  const visibleMetricKeys = useMemo(() => {
    if (showAllMetrics && role === "Admin") return quantitativeFields.map(([key]) => key);
    return [...new Set(selectedMetricGroups.flatMap((group) => metricGroups[group] || []))];
  }, [role, selectedMetricGroups, showAllMetrics]);
  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function updateActivityType(value) {
    setForm((current) => ({ ...current, activityType: value }));
    setSelectedMetricGroups(recommendedMetricGroups(value));
    setShowAllMetrics(false);
  }
  function toggleList(key, value) {
    setForm((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  }
  function toggleMetricGroup(group) {
    setSelectedMetricGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);
  }
  function toggleEvidenceField(key) {
    setSelectedEvidenceFields((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    if (disabled) return;
    if (!form.projectName || !form.activityName || !form.responsiblePerson) {
      setSubmitError("Project name, activity name, and responsible person are required.");
      return;
    }
    if (!form.pillars.length) {
      setSubmitError("Select at least one sustainability pillar.");
      return;
    }
    if (!form.sdgs.length && !form.otherSdg) {
      setSubmitError("Select at least one SDG or enter Other SDG.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        ecologyDescription: form.pillars.includes("Ecology") ? form.ecologyDescription : "",
        societyDescription: form.pillars.includes("Society") ? form.societyDescription : "",
        cultureDescription: form.pillars.includes("Culture") ? form.cultureDescription : "",
        economyDescription: form.pillars.includes("Economy") ? form.economyDescription : "",
        ...Object.fromEntries(evidenceFields.map(([key]) => [key, selectedEvidenceFields.includes(key) ? form[key] : ""])),
      });
      if (!initial) setForm(blankSubmission);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }
  if (role === "Viewer") {
    return (
      <article className="panel">
        <h3>Data submission requires approval</h3>
        <p className="summary-text">Your account is currently Viewer. You can view dashboards and reports, but Ahmed Bahrawy must promote your account to Stakeholder / Project Officer before you can submit RDC activity data.</p>
      </article>
    );
  }
  return (
    <form className="submission stack" onSubmit={handleSubmit}>
      <FormSection title="A. General Information">
        <Field label="Project name" value={form.projectName} onChange={(v) => update("projectName", v)} />
        <Field label="Activity name" value={form.activityName} onChange={(v) => update("activityName", v)} />
        <SelectField label="Activity type" value={form.activityType} options={ACTIVITY_TYPES} onChange={updateActivityType} />
        <Field label="Responsible person" value={form.responsiblePerson} onChange={(v) => update("responsiblePerson", v)} />
        <Field label="Organization / department" value={form.organization} onChange={(v) => update("organization", v)} />
        <Field label="Implementing partners" value={form.partners} onChange={(v) => update("partners", v)} />
        <SelectField label="Village" value={form.village} options={VILLAGES} onChange={(v) => update("village", v)} />
        <Field label="Date or implementation period" value={form.datePeriod} onChange={(v) => update("datePeriod", v)} />
        <SelectField label="Target group" value={form.targetGroup} options={TARGET_GROUPS} onChange={(v) => update("targetGroup", v)} />
        <TextArea label="Main objective" value={form.objective} onChange={(v) => update("objective", v)} />
        <TextArea label="Short activity description" value={form.description} onChange={(v) => update("description", v)} />
      </FormSection>
      <FormSection title="B. Quantitative Impact Data">
        <div className="metric-intro span-2">
          <strong>Suggested metric groups for {form.activityType}</strong>
          <p>Stakeholders only see the metrics most related to this activity type. Add another group if the activity has wider impact.</p>
        </div>
        <div className="metric-groups span-2">
          {Object.keys(metricGroups).map((group) => (
            <label key={group}>
              <input type="checkbox" checked={selectedMetricGroups.includes(group)} onChange={() => toggleMetricGroup(group)} />
              {group}
            </label>
          ))}
        </div>
        {role === "Admin" && (
          <label className="admin-manual span-2">
            <input type="checkbox" checked={showAllMetrics} onChange={(event) => setShowAllMetrics(event.target.checked)} />
            Admin manual mode: show all quantitative metrics
          </label>
        )}
        {quantitativeFields
          .filter(([key]) => visibleMetricKeys.includes(key))
          .map(([key, label]) => <Field key={key} type="number" label={label} value={form[key]} onChange={(v) => update(key, v)} />)}
        <TextArea label="Other measurable results" value={form.otherResults} onChange={(v) => update("otherResults", v)} />
      </FormSection>
      <FormSection title="C. Sustainability Pillars">
        <CheckboxGroup values={PILLARS} selected={form.pillars} onToggle={(value) => toggleList("pillars", value)} />
        {!form.pillars.length && <div className="metric-intro span-2"><strong>Select one or more pillars</strong><p>The impact explanation fields will appear only for the selected pillars.</p></div>}
        {form.pillars.includes("Ecology") && <TextArea label="Ecology impact description" helper="Waste reduction, recycling, composting, environmental awareness, climate action, sustainable agriculture, natural resource protection." value={form.ecologyDescription} onChange={(v) => update("ecologyDescription", v)} />}
        {form.pillars.includes("Society") && <TextArea label="Society impact description" helper="Health access, education, inclusion, community participation, women empowerment, youth development, quality of life." value={form.societyDescription} onChange={(v) => update("societyDescription", v)} />}
        {form.pillars.includes("Culture") && <TextArea label="Culture impact description" helper="Arts, storytelling, local identity, school culture, community learning, traditional knowledge, awareness through creative methods." value={form.cultureDescription} onChange={(v) => update("cultureDescription", v)} />}
        {form.pillars.includes("Economy") && <TextArea label="Economy impact description" helper="Income generation, employability, skills development, micro-enterprises, local production, cost-saving solutions." value={form.economyDescription} onChange={(v) => update("economyDescription", v)} />}
      </FormSection>
      <FormSection title="D. SDG Mapping"><CheckboxGroup values={SDGS.map((s) => `${s.number}: ${s.name}`)} selected={form.sdgs.map(String)} onToggle={(value) => toggleList("sdgs", value.split(":")[0])} /><Field label="Other SDG" value={form.otherSdg} onChange={(v) => update("otherSdg", v)} /></FormSection>
      <FormSection title="E. Qualitative Impact">{["keyOutcome:Key outcome", "success:Most important success", "challenge:Main challenge", "lessonsLearned:Lessons learned", "testimonial:Human story / testimonial", "beneficiaryQuote:Quote from beneficiary", "beforeAfter:Before and after change", "futureOpportunity:Future opportunity", "supportNeeded:Support needed for scaling"].map((entry) => { const [key, label] = entry.split(":"); return <TextArea key={key} label={label} value={form[key]} onChange={(v) => update(key, v)} />; })}</FormSection>
      <FormSection title="F. Evidence and Documentation">
        <div className="metric-intro span-2">
          <strong>Select available evidence</strong>
          <p>Only choose the documentation types you have. The related link fields will appear below.</p>
        </div>
        <div className="metric-groups span-2">
          {evidenceFields.map(([key, label]) => (
            <label key={key}>
              <input type="checkbox" checked={selectedEvidenceFields.includes(key)} onChange={() => toggleEvidenceField(key)} />
              {label}
            </label>
          ))}
        </div>
        {!selectedEvidenceFields.length && <div className="metric-intro span-2"><strong>No evidence selected yet</strong><p>Select one or more evidence types if supporting documentation is available.</p></div>}
        {evidenceFields
          .filter(([key]) => selectedEvidenceFields.includes(key))
          .map(([key, label]) => <Field key={key} label={label} value={form[key]} onChange={(v) => update(key, v)} />)}
      </FormSection>
      <FormSection title="G. Data Validation"><SelectField label="Data confirmed?" value={form.dataConfirmed} options={["Yes", "No", "Needs review"]} onChange={(v) => update("dataConfirmed", v)} /><Field label="Source of data" value={form.dataSource} onChange={(v) => update("dataSource", v)} /><Field label="Submitted by" value={form.submittedBy} onChange={(v) => update("submittedBy", v)} /><Field label="Submission date" type="date" value={form.submissionDate} onChange={(v) => update("submissionDate", v)} /><TextArea label="Admin notes" value={form.adminNotes} onChange={(v) => update("adminNotes", v)} /><SelectField label="Approval status" value={form.approvalStatus} options={["Pending", "Approved", "Needs revision", "Rejected"]} onChange={(v) => update("approvalStatus", v)} /></FormSection>
      {submitError && <div className="auth-error">{submitError}</div>}
      <button className="primary submit-button" disabled={disabled || submitting}>{submitting ? "Submitting..." : initial ? "Save changes" : "Submit impact data"}</button>
    </form>
  );
}

function FormSection({ title, children }) {
  return <fieldset className="panel form-section"><legend>{title}</legend><div className="form-grid">{children}</div></fieldset>;
}

function Field({ label, value, onChange, type = "text" }) {
  return <label>{label}<input min={type === "number" ? 0 : undefined} type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function SelectField({ label, value, options, onChange }) {
  return <label>{label}<select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, helper }) {
  return <label className="span-2">{label}{helper && <small>{helper}</small>}<textarea value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function CheckboxGroup({ values, selected, onToggle }) {
  return <div className="checkbox-group span-2">{values.map((value) => <label key={value}><input type="checkbox" checked={selected.includes(String(value).split(":")[0]) || selected.includes(value)} onChange={() => onToggle(value)} />{value}</label>)}</div>;
}

function activityToForm(activity) {
  return {
    ...blankSubmission,
    projectName: activity.projectName,
    activityName: activity.activityName,
    activityType: activity.activityType,
    responsiblePerson: activity.responsiblePerson,
    organization: activity.organization,
    partners: activity.partners,
    village: activity.villages[0],
    datePeriod: activity.datePeriod,
    targetGroup: activity.targetGroup,
    objective: activity.objective,
    description: activity.description,
    ...activity.metrics,
    pillars: activity.pillars,
    ecologyDescription: activity.pillarDescriptions.Ecology || "",
    societyDescription: activity.pillarDescriptions.Society || "",
    cultureDescription: activity.pillarDescriptions.Culture || "",
    economyDescription: activity.pillarDescriptions.Economy || "",
    sdgs: activity.sdgs.map((s) => String(s.number)),
    ...activity.qualitative,
    dataConfirmed: activity.validation.dataConfirmed,
    dataSource: activity.validation.dataSource,
    submittedBy: activity.validation.submittedBy,
    submissionDate: activity.validation.submissionDate,
    adminNotes: activity.validation.adminNotes,
    approvalStatus: activity.validation.approvalStatus,
  };
}

createRoot(document.getElementById("root")).render(<App />);
