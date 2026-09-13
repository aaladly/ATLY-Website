import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { LoginForm } from "@/components/admin/LoginForm";
import { isAdminConfigured, isSignedIn, missingAdminConfig } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  // Reading the session cookie makes this route dynamic, which is what we
  // want: a cached login page would be the same page for everyone.
  if (await isSignedIn()) redirect("/admin");

  const configured = isAdminConfigured();
  const missing = missingAdminConfig();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-gutter py-section">
      <Wordmark size="sm" className="items-start" />
      <h1 className="mt-8 text-display-l">Admin</h1>

      {configured ? (
        <>
          <p className="mt-4 text-body-m text-cocoa">
            Orders, what is available, and what it costs.
          </p>
          <div className="mt-9">
            <LoginForm />
          </div>
        </>
      ) : (
        /*
         * No password is configured, so there is nothing to sign in with.
         *
         * This says so plainly rather than showing a form that can never
         * succeed. There is deliberately no default password and no "unset
         * means open" path — an admin that quietly works with no
         * configuration is an admin that ships to production wide open.
         */
        <div className="mt-8 border-2 border-error bg-ivory p-6">
          <h2 className="text-display-s text-error">Not set up yet</h2>
          <p className="mt-3 text-body-m">
            This server has no admin password, so nobody can sign in — including
            anyone who should not.
          </p>
          <p className="mt-4 text-body-s text-cocoa">
            Missing from <code>.env.local</code>: {missing.join(", ")}.
          </p>
          <p className="mt-4 text-body-s text-cocoa">
            Run <code>npm run admin:password</code> to make a password hash, and{" "}
            <code>npm run admin:secret</code> for a session secret. Neither
            command prints your password, and neither value is ever committed.
          </p>
        </div>
      )}

      <p className="mt-10 text-body-s">
        <Link href="/" className="text-cocoa-deep">
          &larr; Back to the shop
        </Link>
      </p>
    </main>
  );
}
