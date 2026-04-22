import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import prisma from "../src/lib/prisma";
import { Role } from "../src/generated/prisma/enums";

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");
    process.exit(1);
  }
  if (password.length < 16) {
    console.error("SEED_ADMIN_PASSWORD must be at least 16 characters");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    await prisma.$disconnect();
    return;
  }

  const now = new Date();
  const userId = crypto.randomUUID();
  const hashed = await hashPassword(password);

  await prisma.user.create({
    data: {
      id: userId,
      name: "Admin",
      email: email.toLowerCase(),
      emailVerified: false,
      role: Role.ADMIN,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log(`Admin user created: ${email}`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
