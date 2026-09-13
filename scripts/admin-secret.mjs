/**
 * Make an admin session secret.
 *
 *   npm run admin:secret
 *
 * 32 random bytes. This signs the admin's session cookie: with it, someone
 * could mint a session and skip the password entirely, so it belongs in
 * .env.local and nowhere else.
 *
 * Changing it signs everyone out immediately, which is the emergency exit if a
 * session is ever thought to be compromised.
 */

import { randomBytes } from "node:crypto";

console.log("\nPut this line in .env.local:\n");
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
console.log(
  "\nKeep it out of git. Changing it signs out every admin session at once.\n",
);
