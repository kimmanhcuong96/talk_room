import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

const rawSiteUrl = process.env.VITE_SITE_URL
  ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
  ?? process.env.RENDER_EXTERNAL_URL
  ?? process.env.VERCEL_URL
  ?? "https://me2talk.com";

if (rawSiteUrl) {
  const siteUrl = new URL(/^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`);
  const baseUrl = siteUrl.toString().replace(/\/$/, "");
  const pages = ["/", "/about", "/privacy", "/contact", "/rewards"];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((path) => `  <url><loc>${baseUrl}${path}</loc></url>`).join("\n")}
</urlset>
`;
  const robots = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`;

  writeFileSync(join(scriptDir, "../dist/sitemap.xml"), sitemap, "utf8");
  writeFileSync(join(scriptDir, "../dist/robots.txt"), robots, "utf8");
}
