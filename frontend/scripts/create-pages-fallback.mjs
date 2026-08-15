import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(scriptDir, "../dist");
const indexPath = join(distDir, "index.html");
const fallbackPath = join(distDir, "404.html");

if (existsSync(indexPath)) {
  const source = readFileSync(indexPath, "utf8");
  const fallbackHtml = source.replace(
    /<meta name="robots" content="[^"]*" \/>/,
    '<meta name="robots" content="noindex, nofollow" />'
  );
  writeFileSync(fallbackPath, fallbackHtml, "utf8");

  // Give crawlers useful metadata before the SPA hydrates each public content page.
  const rawSiteUrl = (process.env.VITE_SITE_URL ?? "https://me2talk.com").trim();
  const siteUrl = new URL(/^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`)
    .toString()
    .replace(/\/$/, "");
  const pages = {
    about: {
      title: "About me2talk | Me to talk",
      description: "Discover me2talk, a welcoming space for language practice, meaningful conversations, and genuine connection."
    },
    privacy: {
      title: "Privacy Policy | me2talk",
      description: "Learn how me2talk handles account, room, chat, audio, and video data while you use Me to talk."
    },
    contact: {
      title: "Contact Us | me2talk",
      description: "Contact the me2talk team for support, feedback, feature ideas, room reports, or partnership enquiries."
    },
    rewards: {
      title: "Reward Points Policy | me2talk",
      description: "Learn how me2talk points are earned through room activity, referrals, favorites, quality conversations, and community contribution."
    }
  };

  for (const [path, metadata] of Object.entries(pages)) {
    const pageHtml = source
      .replace(/<title>[^<]*<\/title>/, `<title>${metadata.title}</title>`)
      .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${metadata.description}" />`)
      .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${metadata.title}" />`)
      .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${metadata.description}" />`)
      .replace("    <link rel=\"icon\"", `    <link rel="canonical" href="${siteUrl}/${path}" />\n    <link rel="icon"`);
    const pageDir = join(distDir, path);
    mkdirSync(pageDir, { recursive: true });
    writeFileSync(join(pageDir, "index.html"), pageHtml, "utf8");
  }
}
