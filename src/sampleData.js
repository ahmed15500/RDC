export const VILLAGES = [
  "Galfina 1",
  "Galfina 2",
  "Galfina 3",
  "Basateen Barakat",
  "Ali Kamel Metwally",
  "El-Tahaweya",
  "Abu Shaier",
  "Abu Shousha",
  "Karama",
  "El-Dahhar",
  "Maher",
  "Nabih",
  "Kamal Nakhla",
  "Multiple Villages",
  "Other",
];

export const ACTIVITY_TYPES = [
  "Waste Management",
  "Waste for Food",
  "Health / Physiotherapy Convoys",
  "Women Empowerment",
  "Youth Development",
  "Summer Schools",
  "Arts for Climate",
  "Football Academy",
  "Farmer Support",
  "Community Awareness",
  "Training / Workshop",
  "Research / Data Collection",
  "Other",
];

export const PILLARS = ["Ecology", "Society", "Culture", "Economy"];
export const ROLES = ["Admin", "Stakeholder / Project Officer", "Viewer"];
export const TARGET_GROUPS = ["Women", "Youth", "Children / Students", "Farmers", "Teachers", "Households", "Community members", "Volunteers", "People with health needs", "Mixed groups"];

export const SDGS = [
  { number: 1, name: "No Poverty" },
  { number: 2, name: "Zero Hunger" },
  { number: 3, name: "Good Health and Well-being" },
  { number: 4, name: "Quality Education" },
  { number: 5, name: "Gender Equality" },
  { number: 6, name: "Clean Water and Sanitation" },
  { number: 8, name: "Decent Work and Economic Growth" },
  { number: 10, name: "Reduced Inequalities" },
  { number: 11, name: "Sustainable Cities and Communities" },
  { number: 12, name: "Responsible Consumption and Production" },
  { number: 13, name: "Climate Action" },
  { number: 17, name: "Partnerships for the Goals" },
];

const records = [
  ["Waste for Food Circular Economy Pilot", "Organic waste sorting and compost training", "Waste for Food", ["Galfina 1", "Galfina 2"], "2026 Q1", "Households", ["Ecology", "Economy", "Society"], [12, 13, 8], [180, 540, 72, 96, 44, 60, 35, 18, 1, 7, 24, 3, 5, 0, 920, 360, 410, 180, 28000, 9, 135], "Households separated organic waste and used compost in home gardens.", "Sorting contamination was reduced after practical demonstrations.", "Follow-up collection routes need stronger community coordination.", "Expand compost hubs and link produce to local markets."],
  ["RDC Health Access Program", "Physiotherapy and health convoy", "Health / Physiotherapy Convoys", ["El-Tahaweya"], "2026-02-12", "People with health needs", ["Society"], [3, 10, 17], [260, 780, 120, 148, 0, 42, 38, 0, 0, 0, 18, 1, 0, 260, 0, 0, 0, 0, 0, 0, 0], "Residents received diagnosis, referral, and physiotherapy support close to home.", "Women and elderly residents reported reduced travel barriers.", "Some cases need multi-visit follow-up beyond convoy day.", "Build a village-level referral calendar."],
  ["Women Enterprise Circles", "Food processing and microenterprise workshop", "Women Empowerment", ["Basateen Barakat"], "2026 Q1", "Women", ["Society", "Economy"], [1, 5, 8, 10], [90, 240, 54, 90, 48, 8, 12, 0, 0, 3, 12, 2, 6, 0, 0, 0, 0, 0, 46000, 14, 310], "Women developed production, pricing, and sales skills for local food products.", "Participants formed two informal production groups.", "Packaging and market access remain scaling barriers.", "Connect the groups to campus and community sales channels."],
  ["Summer School for Sustainability", "Children climate learning camp", "Summer Schools", ["Kamal Nakhla"], "2026 summer", "Children / Students", ["Culture", "Society", "Ecology"], [4, 11, 13], [160, 410, 88, 72, 0, 40, 160, 0, 2, 10, 16, 2, 8, 0, 25, 12, 5, 75, 0, 0, 0], "Students connected school learning with waste, water, art, and village life.", "Teachers adopted activity-based climate learning exercises.", "The program needs more reusable Arabic teaching kits.", "Create a trainer-of-trainers model for school staff."],
  ["Arts for Climate Caravan", "Community mural and storytelling day", "Arts for Climate", ["Karama", "Nabih"], "2026-03", "Youth", ["Culture", "Ecology", "Society"], [4, 11, 13, 17], [130, 360, 70, 58, 0, 92, 55, 0, 1, 6, 20, 2, 2, 0, 60, 28, 0, 20, 0, 0, 0], "Youth used art and storytelling to communicate climate action in public spaces.", "The mural became a visible community reminder of sorting and water conservation.", "Outdoor events are sensitive to weather and material logistics.", "Develop a village arts toolkit and traveling exhibition."],
  ["Farmer Soil Health Support", "Compost use and crop advisory visit", "Farmer Support", ["Maher", "Ali Kamel Metwally"], "2026 Q2", "Farmers", ["Ecology", "Economy"], [2, 8, 12, 13], [115, 300, 65, 24, 0, 18, 5, 115, 0, 0, 10, 1, 4, 0, 0, 0, 220, 210, 52000, 8, 0], "Farmers tested compost application and basic soil-improvement practices.", "Early adopters reported reduced spending on some soil inputs.", "More soil testing is needed for crop-specific advice.", "Set up seasonal farmer field schools."],
  ["Football Academy and Life Skills", "Youth sports and leadership sessions", "Football Academy", ["Abu Shaier"], "2026 Q1-Q2", "Youth", ["Society", "Culture"], [3, 4, 10, 11], [210, 500, 100, 68, 0, 210, 35, 0, 1, 4, 22, 4, 10, 0, 0, 0, 0, 0, 0, 2, 0], "Football sessions created a regular safe space for teamwork and life skills.", "Parents reported better attendance and social discipline among youth.", "Girls' participation requires more family outreach.", "Create mixed leadership workshops with sport coaches."],
  ["Community Baseline Mapping", "Village household and needs survey", "Research / Data Collection", ["Galfina 3", "El-Dahhar"], "2026-01", "Community members", ["Society", "Economy", "Ecology", "Culture"], [1, 3, 4, 6, 11, 17], [340, 1020, 210, 176, 0, 88, 64, 45, 3, 12, 28, 4, 3, 0, 0, 0, 0, 0, 0, 0, 0], "RDC created a baseline for planning village-specific interventions.", "Local coordinators improved data ownership and trust.", "Paper forms slowed validation and aggregation.", "Use this dashboard for digital submissions and faster reporting."],
];

export const seedActivities = records.map((r, index) => {
  const metricKeys = [
    "directBeneficiaries",
    "indirectBeneficiaries",
    "households",
    "women",
    "womenTrained",
    "youth",
    "childrenStudents",
    "farmers",
    "schools",
    "teachers",
    "volunteers",
    "communityEvents",
    "trainings",
    "healthCases",
    "wasteCollectedKg",
    "wasteRecycledKg",
    "wasteCompostedKg",
    "treesPlanted",
    "incomeGenerated",
    "jobsCreated",
    "productsSold",
  ];
  const metrics = Object.fromEntries(metricKeys.map((key, metricIndex) => [key, r[8][metricIndex]]));
  return {
    id: `act-${index + 1}`,
    projectName: r[0],
    activityName: r[1],
    activityType: r[2],
    responsiblePerson: ["Mona Hassan", "Youssef Adel", "Farida Samir", "Karim Nabil"][index % 4],
    organization: "Rural Development Center, Heliopolis University",
    partners: ["Community association", "Village coordinator", "Faculty team", "Local school"][index % 4],
    villages: r[3],
    datePeriod: r[4],
    targetGroup: r[5],
    objective: "Strengthen integrated rural development outcomes through evidence-based field activity.",
    description: r[1],
    metrics,
    otherResults: "Additional local outcomes documented in evidence folders.",
    pillars: r[6],
    pillarDescriptions: {
      Ecology: r[6].includes("Ecology") ? r[9] : "",
      Society: r[6].includes("Society") ? r[9] : "",
      Culture: r[6].includes("Culture") ? r[9] : "",
      Economy: r[6].includes("Economy") ? r[9] : "",
    },
    sdgs: r[7].map((number) => SDGS.find((sdg) => sdg.number === number)).filter(Boolean),
    qualitative: {
      keyOutcome: r[9],
      success: r[10],
      challenge: r[11],
      lessonsLearned: "Field demonstrations and trusted local coordinators improve data quality and participation.",
      testimonial: `"The activity made the idea practical for our village, not just a lecture."`,
      beneficiaryQuote: `"We can now explain the change to our neighbors."`,
      beforeAfter: "Before the activity, knowledge and coordination were fragmented. Afterward, residents had clearer practices and follow-up needs.",
      futureOpportunity: r[12],
      supportNeeded: "More evidence documentation, recurring visits, and partner support for scaling.",
    },
    evidence: [
      { type: "Photos", url: "https://drive.google.com/rdc/sample-photos", notes: "Sample link" },
      { type: "Attendance sheets", url: "https://drive.google.com/rdc/sample-attendance", notes: "Sample link" },
    ],
    validation: {
      dataConfirmed: index % 3 === 0 ? "Needs review" : "Yes",
      submittedBy: ["rdc.officer@hu.edu.eg", "village.coordinator@partner.org", "trainer@hu.edu.eg"][index % 3],
      submissionDate: `2026-0${(index % 6) + 1}-15`,
      dataSource: "Field report and attendance sheet",
      approvalStatus: ["Approved", "Pending", "Needs revision"][index % 3],
      adminNotes: "Sample record for dashboard testing.",
    },
  };
});