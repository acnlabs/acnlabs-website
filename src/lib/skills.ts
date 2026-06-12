/**
 * Official skills catalog.
 *
 * Source of truth for each skill lives in its OWNING repo and is served at a
 * live endpoint (see `source`). This catalog aggregates them at build time:
 * it fetches the live `source`; if that fails (upstream down during a deploy)
 * it falls back to the committed snapshot under `src/skills/_snapshots/` so the
 * site always builds. Snapshots are fallbacks only — do not treat them as the
 * source of truth; refresh them from the owning repo when the skill changes.
 */
import { parseFrontmatter, createMarkdownProcessor } from "@astrojs/markdown-remark";

import acnSnapshot from "../skills/_snapshots/acn.md?raw";
import storeSnapshot from "../skills/_snapshots/agentplanet-store.md?raw";
import storeCnSnapshot from "../skills/_snapshots/agentplanet-store-cn.md?raw";

export interface SkillSource {
  /** Stable catalog id; used in the URL path (/skills/<id>). */
  id: string;
  /** Display name in the catalog index. */
  label: string;
  /** Owning product/family. */
  owner: string;
  /** Small badge shown in the index. */
  badge?: string;
  /** Live upstream URL fetched at build time (the owning service serves this). */
  source: string;
  /** Source-of-truth repository. */
  repo?: string;
  /** Product homepage. */
  homepage?: string;
  /** Committed fallback used only when the live fetch fails. */
  snapshot: string;
}

export const SKILL_SOURCES: SkillSource[] = [
  {
    id: "acn",
    label: "ACN — Agent Collaboration Network",
    owner: "ACN",
    badge: "Network",
    source: "https://api.acnlabs.dev/skill.md",
    repo: "https://github.com/acnlabs/ACN",
    homepage: "https://acnlabs.dev",
    snapshot: acnSnapshot,
  },
  {
    id: "agentplanet-store",
    label: "AgentPlanet Store — Seller",
    owner: "AgentPlanet",
    badge: "AgentPlanet",
    source: "https://api.agentplanet.org/api/store/skill.md",
    repo: "https://github.com/acnlabs/Agentplanet-backend",
    homepage: "https://agentplanet.org",
    snapshot: storeSnapshot,
  },
  {
    id: "agentplanet-store-cn",
    label: "AgentPlanet Store CN — 中国区卖家",
    owner: "AgentPlanet",
    badge: "AgentPlanet CN",
    source: "https://mp.acnlabs.cn/skill.md",
    homepage: "https://acnlabs.cn",
    snapshot: storeCnSnapshot,
  },
];

export interface LoadedSkill extends SkillSource {
  /** Full markdown including frontmatter. */
  raw: string;
  /** Markdown body (frontmatter stripped). */
  body: string;
  /** Rendered HTML of the body. */
  html: string;
  /** Frontmatter `name` (falls back to label). */
  name: string;
  /** Frontmatter `description`. */
  description: string;
  /** Frontmatter `metadata.version`, if present. */
  version: string | null;
  /** True when the live source was reachable at build time. */
  fresh: boolean;
}

async function fetchRaw(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "acnlabs-skills-catalog" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Sanity: a skill file must start with YAML frontmatter.
    if (!text.trimStart().startsWith("---")) return null;
    return text;
  } catch {
    return null;
  }
}

// Short TTL cache. With on-demand + ISR (see astro.config.mjs) the edge already
// caches responses for the ISR `expiration`; this in-process cache only dedupes
// the live fetch across calls within a single request / warm invocation. Keep
// the TTL below the ISR expiration so every regeneration re-fetches the source.
const _CACHE_TTL_MS = 60_000;
let _cache: { at: number; skills: LoadedSkill[] } | null = null;

export async function loadSkills(): Promise<LoadedSkill[]> {
  if (_cache && Date.now() - _cache.at < _CACHE_TTL_MS) return _cache.skills;
  const processor = await createMarkdownProcessor({});
  const loaded: LoadedSkill[] = [];
  for (const s of SKILL_SOURCES) {
    const live = await fetchRaw(s.source);
    if (!live) {
      console.warn(
        `[skills] live fetch failed for "${s.id}" (${s.source}); using committed snapshot.`,
      );
    }
    const raw = live ?? s.snapshot;
    const { frontmatter, content } = parseFrontmatter(raw);
    const rendered = await processor.render(content);
    const meta = (frontmatter.metadata ?? {}) as Record<string, unknown>;
    loaded.push({
      ...s,
      raw,
      body: content,
      html: rendered.code,
      name: (frontmatter.name as string) || s.label,
      description: (frontmatter.description as string) || "",
      version: (meta.version as string) ?? null,
      fresh: live != null,
    });
  }
  _cache = { at: Date.now(), skills: loaded };
  return loaded;
}

export async function getSkill(id: string): Promise<LoadedSkill | undefined> {
  return (await loadSkills()).find((s) => s.id === id);
}
