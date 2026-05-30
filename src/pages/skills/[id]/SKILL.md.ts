import type { APIRoute, GetStaticPaths } from "astro";
import { loadSkills } from "@/lib/skills";

export const getStaticPaths: GetStaticPaths = async () => {
  const skills = await loadSkills();
  return skills.map((s) => ({ params: { id: s.id }, props: { raw: s.raw } }));
};

export const GET: APIRoute = ({ props }) =>
  new Response(props.raw as string, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
