import type { APIRoute } from "astro";
import { getSkill } from "@/lib/skills";

// On-demand + ISR (see astro.config.mjs): serves the live raw markdown so the
// published doc tracks the owning repo without a site rebuild.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const skill = await getSkill(params.id!);
  if (!skill) {
    return new Response("Skill not found", { status: 404 });
  }
  return new Response(skill.raw, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
