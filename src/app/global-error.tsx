"use client";

/**
 * The root layout itself failed.
 *
 * This replaces the whole document, so it has to supply its own <html> and
 * <body> — and it cannot rely on anything from the layout that just broke,
 * which includes the font variables and the Tailwind theme. So the styling
 * here is inline and self-contained, using the palette's literal hex values
 * rather than its tokens.
 *
 * It should almost never be seen. Everything inside the shop is caught by
 * (site)/error.tsx first.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8e2c4",
          color: "#4e1901",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          lineHeight: 1.7,
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "30rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: "#7e5822",
              margin: 0,
            }}
          >
            ATLY Belgian Chocolate
          </p>
          <h1 style={{ fontSize: "2rem", fontWeight: 400, margin: "1rem 0 0" }}>
            The site is having a moment
          </h1>
          <p style={{ margin: "1.25rem 0 0", color: "#7a4a2b" }}>
            Our fault, not yours. Please try again in a minute.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              backgroundColor: "#4e1901",
              color: "#f8e2c4",
              border: "none",
              padding: "1rem 2rem",
              fontSize: "0.75rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>

          {error.digest && (
            <p
              style={{
                marginTop: "2.5rem",
                fontSize: "0.875rem",
                color: "#7a4a2b",
              }}
            >
              If you get in touch, quote this: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
