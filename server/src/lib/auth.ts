import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:5174"],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const email = ctx.body?.email;
      if (!email) return;
      const user = await prisma.user.findUnique({
        where: { email: String(email).toLowerCase() },
        select: { isActive: true, deletedAt: true },
      });
      if (user && (!user.isActive || user.deletedAt !== null)) {
        throw new APIError("FORBIDDEN", { message: "Account is disabled" });
      }
    }),
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "AGENT",
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
});
