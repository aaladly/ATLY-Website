/**
 * Make an admin password hash.
 *
 *   npm run admin:password
 *
 * Asks for a password, prints a scrypt hash, and never writes the password
 * anywhere. Paste the hash into ADMIN_PASSWORD_HASH in .env.local.
 *
 * The password is typed at a prompt rather than passed as an argument on
 * purpose: an argument would sit in shell history in plain text.
 */

import { createInterface } from "node:readline";
import { hashPassword } from "../src/lib/admin/password.ts";

/** Read a line without echoing it back to the terminal. */
function askSecret(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    let muted = false;
    // readline writes each keystroke back to the terminal; this drops them
    // once the prompt itself has been printed.
    rl._writeToOutput = (chunk) => {
      if (!muted) rl.output.write(chunk);
    };

    rl.question(question, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

const MIN_LENGTH = 12;

const password = await askSecret("New admin password: ");

if (password.length < MIN_LENGTH) {
  console.error(
    `\nToo short. This one password is the only thing between the internet and\nevery customer's name, address and phone number. Use at least ${MIN_LENGTH}\ncharacters — a passphrase of a few unrelated words is easier to type and\nharder to guess than something short with punctuation in it.\n`,
  );
  process.exit(1);
}

const again = await askSecret("Type it again: ");

if (password !== again) {
  console.error("\nThose did not match. Nothing was changed.\n");
  process.exit(1);
}

const hash = await hashPassword(password);

console.log("\nPut this line in .env.local:\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}`);
console.log(
  "\nThe password itself is not stored anywhere, here or in the app. If you\nforget it, run this again to make a new hash.\n",
);
