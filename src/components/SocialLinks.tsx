import { BRAND } from "@/lib/catalog";

/**
 * Line icons in the brand brown, drawn inline.
 *
 * Deliberately not the official coloured badge graphics: those would drop
 * bright blue and magenta into a palette that is brown, cream and gold, and
 * nothing else.
 */
function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3H9v9h3v-9h2.5l.5-3H12V6.5a1 1 0 0 1 1-1h2Z" />
    </svg>
  );
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.75" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Shared by the footer and the About page, so the two can never drift apart
 * in which accounts they list or how they are worded.
 */
export function SocialLinks({
  size = "sm",
  className = "",
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  const iconSize = size === "lg" ? 26 : 20;
  const textClass = size === "lg" ? "text-body-l" : "text-body-m";

  return (
    <ul className={`space-y-3 ${className}`}>
      <li>
        <a
          href={BRAND.social.instagram}
          className={`inline-flex items-center gap-3 ${textClass} text-cocoa-deep no-underline hover:text-gold-deep`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <InstagramIcon size={iconSize} />
          Instagram
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
      <li>
        <a
          href={BRAND.social.facebook}
          className={`inline-flex items-center gap-3 ${textClass} text-cocoa-deep no-underline hover:text-gold-deep`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FacebookIcon size={iconSize} />
          Facebook
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
    </ul>
  );
}
