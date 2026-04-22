import { execSync } from "child_process";
import * as dotenv from "dotenv";

export default async function globalSetup() {
  dotenv.config({ path: ".env.test" });

  const env = { ...process.env };

  execSync("bunx prisma migrate reset --force", {
    cwd: "server",
    env: { ...env, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "allow claude to take action during testing" },
    stdio: "inherit",
  });

  execSync("bun run prisma/seed.ts", {
    cwd: "server",
    env,
    stdio: "inherit",
  });
}
