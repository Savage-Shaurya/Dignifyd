// All copy is taken verbatim (or trimmed) from dignifyd.io; see ../../../dignifyd-content.md.
// Section structure mirrors the weevolveit.com homepage.

export const brand = {
  name: "Dignifyd Group",
  email: "hello@dignifyd.io",
  phone: "+1-877-735-0397",
  phoneHref: "tel:+18777350397",
  hq: "4 Winsley Street, London W1W 8HF",
};

// The five phases of the delivery chain (preloader, method, tracker).
export const phases = [
  {
    key: "hire",
    word: "Hire",
    letter: "H",
    entity: "Talent Connect",
    lead: "Verified specialists in seat: first qualified submissions in 36 hours.",
    bullets: [
      "managed talent acquisition, GCC & capability building and talent intelligence",
      "niche & leadership search · volume hiring · GCC build-operate-transfer",
      "36h first submissions · 92% day-90 retention",
    ],
  },
  {
    key: "build",
    word: "Build",
    letter: "B",
    entity: "Dignifyd Tech",
    lead: "Cloud, applications and managed IT for the enterprise estate.",
    bullets: [
      "assessed, built, deployed and supported under one delivery standard",
      "cloud services · managed IT · web & mobile · big data & analytics",
      "1,500+ projects · 98% satisfaction",
    ],
  },
  {
    key: "run",
    word: "Run",
    letter: "R",
    entity: "Enterprise Solutions",
    lead: "ERP and infrastructure that stay stable, secure and maintainable.",
    bullets: [
      "ERP implementation, cloud delivery and enterprise architecture advisory",
      "for BFSI, technology and manufacturing",
      "6 shared delivery centres",
    ],
  },
  {
    key: "grow",
    word: "Grow",
    letter: "G",
    entity: "Dignifyd Digital",
    lead: "Brand, demand generation and creative that take you to market.",
    bullets: [
      "digital strategy · demand generation · brand identity · creative production",
      "for the same enterprises the other four entities serve",
      "40+ programmes delivered",
    ],
  },
  {
    key: "decide",
    word: "Decide",
    letter: "D",
    entity: "Dignifyd Data Labs",
    lead: "Data engineering and applied AI for intelligent decision systems.",
    bullets: [
      "data engineering · applied AI/ML · workforce & business analytics",
      "the team behind the Group's own AI matching engine",
      "AI scoring engine, proven in production",
    ],
  },
] as const;

export type NavItem = {
  label: string;
  href: string;
  panel?: "group" | "advantage" | "engage" | "footprint";
  sup?: string;
};

export const nav: NavItem[] = [
  { label: "The Group", href: "#group", panel: "group" },
  { label: "What we do", href: "#what-we-do" },
  { label: "Advantage", href: "#advantage", panel: "advantage" },
  { label: "Engage", href: "#enquiry", panel: "engage", sup: "60d" },
  { label: "Footprint", href: "#footprint", panel: "footprint" },
  { label: "Contact", href: "#contact" },
];

export const entities = [
  { name: "Dignifyd Tech", kind: "Technology delivery", letter: "B", href: "https://www.dignifyd.tech", star: false,
    text: "Infrastructure, cloud, applications and managed IT for the enterprise estate." , metric: "1,500+ projects · 98% satisfaction" },
  { name: "Talent Connect", kind: "Workforce delivery", letter: "H", href: "https://dignifydtalentconnect.com", star: true,
    text: "Managed talent acquisition, GCC & capability building and talent intelligence.", metric: "36h first submissions · 92% day-90 retention" },
  { name: "Dignifyd Digital", kind: "Brand & digital", letter: "G", href: "https://www.dignifyd.digital", star: false,
    text: "Digital strategy, marketing, branding and creative.", metric: "40+ programmes delivered" },
  { name: "Enterprise Solutions", kind: "ERP, cloud & infrastructure", letter: "R", href: "#group", star: false,
    text: "ERP implementation, cloud delivery and enterprise architecture advisory.", metric: "6 shared delivery centres" },
  { name: "Dignifyd Data Labs", kind: "Data & applied AI", letter: "D", href: "#group", star: true,
    text: "Data engineering, applied AI/ML and intelligent decision systems.", metric: "AI scoring engine, proven in production" },
];

export const engagements = [
  { name: "Strategic Pilot", tag: "01 · Start here · 60 days", star: true,
    text: "The fastest way to see the delivery model working on your own mandates: 3–5 mandates across 2 functions, structured over 60 days.",
    bullets: ["60-day structured pilot", "3–5 live mandates", "Agreed KPIs from day one"], cta: "Book the 60-day pilot" },
  { name: "Capability Build Programme", tag: "02 · Plan · Build · Operate", star: false,
    text: "Enterprise capability hubs from location strategy to full build-operate-transfer, including leadership hiring for new centres.",
    bullets: ["Location & compliance strategy", "BOT playbooks", "Leadership hiring"], cta: "Start the conversation" },
  { name: "Multi-Year Partnership", tag: "03 · All five entities", star: false,
    text: "The full group relationship: all active mandates, a dedicated single point of contact and monthly business reviews against agreed KPIs.",
    bullets: ["Dedicated SPOC", "Monthly business reviews", "Group-wide priority access"], cta: "Start the conversation" },
];

export const footprint = [
  { city: "London", country: "United Kingdom", role: "Group headquarters", region: "EMEA" },
  { city: "Dubai", country: "United Arab Emirates", role: "Middle East enterprise delivery", region: "EMEA" },
  { city: "Singapore", country: "Singapore", role: "Engineering & analytics hub", region: "APAC" },
  { city: "Toronto", country: "Canada", role: "North American delivery", region: "AMERICAS" },
  { city: "Chicago", country: "Illinois, USA", role: "US operations & support", region: "AMERICAS" },
  { city: "Delhi NCR", country: "India", role: "Engineering, analytics & backend delivery", region: "APAC" },
];

export const hero = {
  line1: "One relationship.",
  line2: "Dignifyd.",
  body:
    "We build your technology, hire your teams, run your infrastructure, grow your brand and turn your data into decisions. Five specialist companies under one contract, across 35+ countries, 24/5.",
  bodyLead: "We build your technology, hire your teams, run your infrastructure, grow your brand and turn your data into decisions.",
  bodyStrong: "Five specialist companies under one contract",
  bodyAccent: "35+ countries, 24/5",
  stats: [
    ["35+", "countries"],
    ["1,500+", "projects"],
    ["120+", "specialists"],
  ] as [string, string][],
  rating: { value: "98%", label: "satisfaction" },
};

export const clientLogos = [
  { src: "/logos/kpmg.png", alt: "KPMG" },
  { src: "/logos/indigo.png", alt: "IndiGo" },
  { src: "/logos/seal-california.png", alt: "State of California" },
  { src: "/logos/igt.png", alt: "IGT" },
  { src: "/logos/radius.png", alt: "Radius" },
  { src: "/logos/seal-texas.png", alt: "State of Texas" },
  { src: "/logos/imz.png", alt: "IMZ" },
  { src: "/logos/in10s.png", alt: "In10s" },
  { src: "/logos/partner-triangle.png", alt: "Partner organisation" },
  { src: "/logos/partner-emblem.png", alt: "Partner organisation" },
  { src: "/logos/partner-star.png", alt: "Partner organisation" },
];

// Cards in the hero carousel (the reference uses Google reviews; Dignifyd has none,
// so these are the manifesto chapters and enterprise commitments from dignifyd.io).
export const cards = [
  { tag: "The One Group Advantage", chip: "CH. 01", title: "One accountable relationship", meta: "Advantage",
    text: "Consolidate the vendor stack into a single commercial framework. One contract, one governance model, one team answerable for the whole outcome, not five suppliers pointing at each other." },
  { tag: "Enterprise & Government", chip: "01", title: "Single contracting framework", meta: "Enterprise",
    text: "One commercial relationship across all five entities: procurement once, not five times." },
  { tag: "The One Group Advantage", chip: "CH. 02", title: "No handover gap", meta: "Advantage",
    text: "One programme, four handovers removed: your team is hired, your platform is built, your data is instrumented and your proposition reaches market, sequenced by one delivery backbone." },
  { tag: "Enterprise & Government", chip: "02", title: "Agreed KPIs, 30-day reviews", meta: "Enterprise",
    text: "Every engagement runs against agreed measures with a standing 30-day review cycle." },
  { tag: "The One Group Advantage", chip: "CH. 03", title: "Measured, not reported", meta: "Advantage",
    text: "Every engagement runs against agreed KPIs with a 30-day review cycle. You see outcomes, not activity decks: first submissions inside 36 hours, 92% of hires still in seat at day 90." },
  { tag: "Enterprise & Government", chip: "03", title: "Auditable delivery standards", meta: "Enterprise",
    text: "ISO and GDPR-aligned practices, documented processes and assessment audit trails." },
  { tag: "The One Group Advantage", chip: "CH. 04", title: "Follow-the-sun, by design", meta: "Advantage",
    text: "Six capability centres across the Americas, EMEA and APAC give 24/5 timezone coverage. Work moves with the sun; the standard stays the same in every centre." },
  { tag: "Enterprise & Government", chip: "04", title: "Public sector experience", meta: "Enterprise",
    text: "Mission-critical talent and technology delivery across citizen services and shared services." },
];

export const framework = {
  label: "The group",
  title: "Five entities",
  titleLead: "Five",
  titleAccent: "entities",
  body:
    "Most enterprises juggle five vendors for this. Dignifyd does it through five specialist companies that share one contract, one governance standard and one delivery backbone, so nothing gets lost between suppliers.",
};

export type EntityKey = "talent" | "tech" | "erp" | "digital" | "data" | "pilot" | "gov" | "general";

export const entityByKey: Record<EntityKey, { name: string; line: string; tags: string[] }> = {
  talent: { name: "Talent Connect", line: "verified specialists in seat, with first qualified submissions in 36 hours.", tags: ["Niche & leadership search", "Volume hiring", "GCC build-operate-transfer"] },
  tech: { name: "Dignifyd Tech", line: "cloud, applications and managed IT, assessed, built, deployed and supported under one delivery standard.", tags: ["Cloud services", "Managed IT", "Web & mobile"] },
  erp: { name: "Enterprise Solutions", line: "ERP and infrastructure that stay stable, secure and maintainable.", tags: ["ERP implementation", "Enterprise architecture", "Business enablement"] },
  digital: { name: "Dignifyd Digital", line: "brand, demand generation and creative that take you to market.", tags: ["Digital strategy", "Demand generation", "Brand identity"] },
  data: { name: "Dignifyd Data Labs", line: "data engineering and applied AI for intelligent decision systems.", tags: ["Data engineering", "Applied AI/ML", "Decision systems"] },
  pilot: { name: "Strategic Pilot", line: "3–5 mandates across 2 functions, structured over 60 days, with agreed KPIs from day one.", tags: ["60-day structured pilot", "3–5 live mandates", "Agreed KPIs from day one"] },
  gov: { name: "Enterprise & Government", line: "one relationship, one governance standard and one delivery backbone: accountable delivery for buyers who answer to everyone.", tags: ["Single contracting framework", "Agreed KPIs, 30-day reviews", "Auditable delivery standards"] },
  general: { name: "The Group", line: "the right entity leads will respond. One relationship starts here.", tags: ["Technology", "Talent & workforce", "Data & AI"] },
};

export const audit = {
  label: "The enquiry",
  title: "What outcome do you need?",
  titleLead: "What outcome do you",
  titleAccent: "need?",
  sub: ["A hire, a platform, a programme.", "Tell us, and the right entity leads will respond..."],
  live: { value: "1,500+", label: "projects delivered" },
  examples: ["a hire", "a platform", "a programme", "a mandate across two functions", "data turned into decisions"],
  chips: [
    { label: "niche & leadership search", key: "talent" },
    { label: "cloud services", key: "tech" },
    { label: "ERP implementation", key: "erp" },
    { label: "demand generation", key: "digital" },
    { label: "applied AI/ML", key: "data" },
    { label: "a 60-day strategic pilot", key: "pilot" },
    { label: "volume hiring", key: "talent" },
    { label: "managed IT", key: "tech" },
    { label: "enterprise architecture", key: "erp" },
    { label: "brand identity", key: "digital" },
    { label: "decision systems", key: "data" },
    { label: "public sector mandate", key: "gov" },
    { label: "GCC build-operate-transfer", key: "talent" },
    { label: "big data & analytics", key: "tech" },
  ] as { label: string; key: EntityKey }[],
  presets: {
    pilot: "a 60-day strategic pilot",
    gov: "public sector mandate",
    general: "a general enquiry",
  } as Record<string, string>,
};

export const marquee = {
  head: "ONE RELATIONSHIP. FIVE SPECIALISED CAPABILITIES. ONE DELIVERY STANDARD. ONE ",
  accent: "CONTRACT",
  tail: ".",
};

export const talk = [
  { kind: "email", title: "email", line: "write to us", value: "hello@dignifyd.io", href: "mailto:hello@dignifyd.io" },
  { kind: "phone", title: "toll-free", line: "call us", value: "+1-877-735-0397", href: "tel:+18777350397" },
];

export const cure = {
  label: "Follow-the-sun",
  before: "The sun never sets on",
  accent: "delivery",
};

export const entitiesLinks = [
  { label: "dignifyd.tech", href: "https://www.dignifyd.tech" },
  { label: "talent connect", href: "https://dignifydtalentconnect.com" },
  { label: "dignifyd.digital", href: "https://www.dignifyd.digital" },
  { label: "dignifyd.io", href: "https://dignifyd.io" },
];

export const footer = {
  columns: [
    {
      title: "The group",
      links: [
        { label: "Dignifyd Tech", href: "https://www.dignifyd.tech" },
        { label: "Talent Connect", href: "https://dignifydtalentconnect.com", star: true },
        { label: "Dignifyd Digital", href: "https://www.dignifyd.digital" },
        { label: "Enterprise Solutions", href: "#group" },
        { label: "Dignifyd Data Labs", href: "#group", star: true },
        { label: "All entities", href: "#group", strong: true },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "What we do", href: "#what-we-do" },
        { label: "The Group", href: "#group" },
        { label: "Advantage", href: "#advantage" },
        { label: "Footprint", href: "#footprint" },
        { label: "Engage", href: "#enquiry" },
        { label: "Contact", href: "#contact" },
      ],
    },
    {
      title: "Engage",
      links: [
        { label: "Strategic Pilot", href: "#enquiry", star: true },
        { label: "Capability Build", href: "#enquiry" },
        { label: "Multi-Year Partnership", href: "#enquiry" },
        { label: "hello@dignifyd.io", href: "mailto:hello@dignifyd.io" },
        { label: "+1-877-735-0397", href: "tel:+18777350397" },
      ],
    },
  ],
  offices: [
    { city: "London", code: "UK", role: "HQ", tz: "Europe/London" },
    { city: "Dubai", code: "UAE", role: "EMEA", tz: "Asia/Dubai" },
    { city: "Singapore", code: "SG", role: "APAC", tz: "Asia/Singapore" },
    { city: "Toronto", code: "CAN", role: "Americas", tz: "America/Toronto" },
    { city: "Chicago", code: "USA", role: "Americas", tz: "America/Chicago" },
    { city: "Delhi NCR", code: "IND", role: "APAC", tz: "Asia/Kolkata" },
  ],
  stats: [
    ["35+", "countries"],
    ["1,500+", "projects"],
    ["120+", "specialists"],
  ],
  standards: ["ISO", "GDPR", "24/5"],
  copyright: "© 2026 Dignifyd Group · All rights reserved · One relationship",
};

// Globe markers: the six capability centres (coordinates from dignifyd.io).
export const centres = [
  { city: "London", lat: 51.5072, lon: -0.1276, hq: true },
  { city: "Dubai", lat: 25.2048, lon: 55.2708 },
  { city: "Singapore", lat: 1.3521, lon: 103.8198 },
  { city: "Toronto", lat: 43.6532, lon: -79.3832 },
  { city: "Chicago", lat: 41.8781, lon: -87.6298 },
  { city: "Delhi NCR", lat: 28.6139, lon: 77.209 },
];
