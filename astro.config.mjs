import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import vercel from "@astrojs/vercel";

// https://astro.build/config
// Output stays `static` (default): the whole site is prerendered EXCEPT the
// `/skills/*` routes, which opt into on-demand rendering (`export const
// prerender = false`). The Vercel adapter caches those on-demand responses with
// ISR so they re-fetch the live skill source (api.agentplanet.org/.../skill.md)
// at most every `expiration` seconds — no manual rebuild needed when a skill doc
// changes, and no build-vs-deploy race.
export default defineConfig({
  site: "https://acnlabs.dev",
  adapter: vercel({ isr: { expiration: 300 } }),
  integrations: [mdx(), sitemap(), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
