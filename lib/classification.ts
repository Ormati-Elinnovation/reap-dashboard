import type { TechMap } from "./types";

// ---- Servers grouping (ported from build_tabs.py _srvgrp) ----
export function classifyServer(merchant: string): "AWS" | "AUTOMAT" | "MongoDB" | null {
  const u = merchant.toUpperCase();
  if (u.includes("AWS EMEA")) return "AWS";
  if (u.includes("AUTOMAT")) return "AUTOMAT";
  if (u.includes("MONGO")) return "MongoDB";
  return null;
}

// ---- Technology classification (ported verbatim from build_infra.py) ----
// Group order is load-bearing (first match wins).
export const TECH_KW: Record<string, string[]> = {
  "Cloud/Hosting": ["AWS EMEA", "GOOGLE CLOUD", "DIGITALOCEAN", "HETZNER", "LINODE", "RENDER", "FLY.IO", "RAILWAY", "AZURE", "GCP"],
  "Database": ["MONGO", "SUPABASE", "PLANETSCALE", "REDIS", "FIREBASE", "NEON"],
  "AI/API infra": ["OPENROUTER", "OPENAI", "ANTHROPIC", "KLING", "ELEVENLABS", "REPLICATE", "HUGGING", "PERPLEXITY", "MISTRAL", "COHERE", "GROQ", "FAL.AI", "RUNPOD", "TOGETHER", "DEEPGRAM", "PINECONE"],
  "Domains/DNS/CDN": ["GODADDY", "CLOUDFLARE", "NAMECHEAP", "VERCEL", "NETLIFY", "FASTLY", "PORKBUN"],
  "Web3 infra": ["ALCHEMY", "INFURA", "QUICKNODE", "MORALIS", "THIRDWEB"],
  "Comms/Email infra": ["TWILIO", "SENDGRID", "AGENTMAIL", "RESEND", "POSTMARK", "MAILGUN", "GOOGLE WORKSPACE", "SLACK", "ZOOM"],
  "Dev infra": ["ATLASSIAN", "JIRA", "GITHUB", "GITLAB", "BITBUCKET", "SENTRY", "DATADOG", "CIRCLECI", "JETBRAINS", "FIGMA", "LINEAR", "NOTION", "CURSOR"],
};

// Supplier normalizer — first substring match wins (order matters).
const SUP: [string, string][] = [
  ["GOOGLE WORKSPACE", "Google Workspace"], ["GOOGLE CLOUD", "Google Cloud"], ["AWS EMEA", "AWS"],
  ["SLACK", "Slack"], ["CURSOR", "Cursor"], ["FIGMA", "Figma"], ["ATLASSIAN", "Atlassian"], ["GODADDY", "GoDaddy"],
  ["KLING", "Kling AI"], ["SENDGRID", "Twilio SendGrid"], ["TWILIO", "Twilio"], ["NOTION", "Notion"],
  ["ALCHEMY", "Alchemy"], ["ZOOM", "Zoom"], ["OPENROUTER", "OpenRouter"], ["OPENAI", "OpenAI"], ["ANTHROPIC", "Anthropic"],
  ["MONGO", "MongoDB"], ["GITHUB", "GitHub"], ["VERCEL", "Vercel"], ["CLOUDFLARE", "Cloudflare"],
];

// Approximation of Python str.title() for the fallback supplier label.
function titleCase(s: string): string {
  return s.toLowerCase().replace(/[A-Za-z]+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function supplierName(merchant: string): string {
  const u = merchant.toUpperCase();
  for (const [k, name] of SUP) if (u.includes(k)) return name;
  return titleCase(merchant);
}

function guessGroup(merchant: string): string | null {
  const u = merchant.toUpperCase();
  for (const g of Object.keys(TECH_KW)) {
    if (TECH_KW[g].some((k) => u.includes(k))) return g;
  }
  return null;
}

export function classifyTech(
  merchant: string,
  techMap: TechMap
): { supplier: string; group: string } | null {
  const exact = techMap[merchant];
  if (exact) return { supplier: exact[0], group: exact[1] };
  const g = guessGroup(merchant);
  if (g) return { supplier: supplierName(merchant), group: g };
  // Server expenses are part of technology too (e.g. AUTOMAT/IT Malam) — group under Cloud/Hosting.
  const srv = classifyServer(merchant);
  if (srv) return { supplier: srv, group: "Cloud/Hosting" };
  return null;
}
