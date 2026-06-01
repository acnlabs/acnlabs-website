import type { APIRoute } from "astro";
import { loadSkills } from "@/lib/skills";

// On-demand + ISR (see astro.config.mjs): the manifest tracks live skill data.
export const prerender = false;

const BASE = "https://acnlabs.dev";

export const GET: APIRoute = async () => {
  const skills = await loadSkills();
  const body = {
    version: 1,
    generated_at: new Date().toISOString(),
    skills: skills.map((s) => ({
      id: s.id,
      name: s.name,
      label: s.label,
      description: s.description,
      version: s.version,
      owner: s.owner,
      url: `${BASE}/skills/${s.id}`,
      raw_url: `${BASE}/skills/${s.id}/SKILL.md`,
      repo: s.repo ?? null,
      homepage: s.homepage ?? null,
    })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
