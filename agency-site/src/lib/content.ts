/**
 * Site-wide content: brand, navigation, footer links, stats, clients.
 * Page-specific data lives in src/lib/data/*.
 */

export const SITE = {
  brand: "YOUR BRAND",
  tagline: "Building Digital Solutions That Matter",
  description:
    "We empower organizations with AI that turns complex challenges into real-world outcomes.",
  email: "hello@yourbrand.agency",
  linkedin: "https://www.linkedin.com/",
  github: "https://github.com/",
  city: "Gujranwala, PK",
  timeZone: "Asia/Karachi",
  copyrightYear: 2026,
} as const;

export type NavItem = {
  label: string;
  href: string;
  menu?: "services" | "resources";
};

export const PRIMARY_NAV: NavItem[] = [
  { label: "Work", href: "/work" },
  { label: "Company", href: "/company" },
  { label: "Services", href: "/services/ui-ux-design", menu: "services" },
  { label: "Resources", href: "/blog", menu: "resources" },
];

export const RESOURCE_LINKS = [
  { label: "Get in Touch", href: "/contact", description: "Tell us about your project" },
  { label: "Case Studies", href: "/work", description: "Results we've shipped" },
  { label: "Company", href: "/company", description: "Who we are and how we work" },
  { label: "Blog", href: "/blog", description: "Notes on design, AI & engineering" },
  {
    label: "Free Templates & Tools",
    href: "/open-resources",
    description: "Open-source resources, free to use",
  },
];

export const DEMO_LINKS = [
  { label: "IntentIQ", href: "/demos/intentiq" },
  { label: "Competitor Matrix", href: "/demos/competitor-matrix" },
  { label: "Data Center GIS", href: "/demos/data-center-gis" },
  { label: "Red Team", href: "/demos/red-team" },
  { label: "Lie Detector", href: "/demos/lie-detector" },
  { label: "Generative Search", href: "/demos/generative-search" },
  { label: "Sentiment AI", href: "/demos/sentiment-ai" },
];

export const STATS = [
  { value: "100+", label: "Projects Delivered" },
  { value: "99%", label: "Client Satisfaction" },
  { value: "24/7", label: "Support Available" },
] as const;

export type Client = { name: string; mark: "orbit" | "hex" | "spark" | "stack" };

export const CLIENTS: Client[] = [
  { name: "Talitrix", mark: "orbit" },
  { name: "Blue Standard", mark: "spark" },
  { name: "Clinix AI", mark: "hex" },
  { name: "OWASP Foundation", mark: "stack" },
  { name: "Vidzee", mark: "spark" },
  { name: "Feature", mark: "orbit" },
  { name: "Northwind", mark: "stack" },
  { name: "Helix Labs", mark: "hex" },
  { name: "Vertex", mark: "spark" },
  { name: "Axiom", mark: "orbit" },
];

export const FOOTER_RESOURCE_LINKS = RESOURCE_LINKS.map(({ label, href }) => ({
  label: label === "Free Templates & Tools" ? "Open Resources" : label,
  href,
}));

export const CONTACT_BUDGETS = [
  "Under $10k",
  "$10k – $25k",
  "$25k – $50k",
  "$50k – $100k",
  "$100k+",
];

export const CONTACT_INTERESTS = [
  "UI/UX Design",
  "Website Design",
  "Web Development",
  "AI Development",
  "AI Agents",
  "Healthcare Apps",
];
