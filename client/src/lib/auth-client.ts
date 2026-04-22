import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../server/src/lib/auth";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [inferAdditionalFields<typeof auth>()],
});
