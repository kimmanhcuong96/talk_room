import { bootstrapOwner } from "../admin/adminRepository.js";
import { getPool } from "../db/pool.js";

function readEmail() {
  const inline = process.argv.find((value) => value.startsWith("--email="))?.slice("--email=".length);
  const index = process.argv.indexOf("--email");
  return (inline ?? (index >= 0 ? process.argv[index + 1] : "") ?? "").trim().toLowerCase();
}

const email = readEmail();
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error("Usage: npm run admin:bootstrap -w backend -- --email owner@example.com");
  process.exitCode = 1;
} else {
  try {
    const owner = await bootstrapOwner(email);
    console.log(`Owner invitation is ready for ${owner.email} (${owner.status}).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

await getPool().end();
