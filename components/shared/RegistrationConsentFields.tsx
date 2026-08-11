"use client";

// The three required registration checkboxes — exact wording from the
// legal package's registration consent/clickwrap source (Block 4,
// 2026-08-10). Shared between JoinRegistrationForm and
// InviteRegistrationForm, the two real account-creation entry points
// (see middleware.ts / app/api/join, app/api/invite) — unlike the
// original spec's mention of "/apply", that route has no form at all,
// it's just a Waitlist-application status page (see
// app/(auth)/apply/page.tsx), so there's nothing to wire there. Google
// OAuth never creates a member account on its own either (see
// app/auth/callback/route.ts) — a first-time OAuth sign-in only ever
// produces a Waitlist row and lands on /apply, so it can't bypass these
// checkboxes; real account creation always goes through one of these
// two forms.
type Props = {
  ageChecked: boolean;
  onAgeChange: (checked: boolean) => void;
  termsChecked: boolean;
  onTermsChange: (checked: boolean) => void;
  aupChecked: boolean;
  onAupChange: (checked: boolean) => void;
};

const labelClass = "flex items-start gap-3 text-left text-[0.8rem] leading-relaxed";
const textStyle = { color: "var(--color-text-secondary)" } as const;
const linkClass = "underline hover:no-underline";

export default function RegistrationConsentFields({
  ageChecked,
  onAgeChange,
  termsChecked,
  onTermsChange,
  aupChecked,
  onAupChange,
}: Props) {
  return (
    <div className="space-y-4">
      <label className={labelClass} style={textStyle}>
        <input
          type="checkbox"
          required
          checked={ageChecked}
          onChange={(e) => onAgeChange(e.target.checked)}
          className="mt-1 shrink-0"
        />
        <span>
          I am <strong>at least 18 years old</strong> (or the age of majority where I live, if higher). I
          understand access requires <strong>age verification</strong>, and I agree to complete it. The
          information I provide about my age and identity is <strong>true</strong>. I understand that helping
          anyone under 18 access Obsidian Club is a permanent, non-appealable violation.
        </span>
      </label>

      <label className={labelClass} style={textStyle}>
        <input
          type="checkbox"
          required
          checked={termsChecked}
          onChange={(e) => onTermsChange(e.target.checked)}
          className="mt-1 shrink-0"
        />
        <span>
          I have read and agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={linkClass}>
            Terms of Service
          </a>{" "}
          and the{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
            Privacy Policy
          </a>
          , including the <strong>binding arbitration</strong> and <strong>class-action waiver</strong> in the
          Terms (which I may opt out of within 30 days as described there), and I consent to the processing of
          my information as described in the Privacy Policy.
        </span>
      </label>

      <label className={labelClass} style={textStyle}>
        <input
          type="checkbox"
          required
          checked={aupChecked}
          onChange={(e) => onAupChange(e.target.checked)}
          className="mt-1 shrink-0"
        />
        <span>
          I have read and agree to the{" "}
          <a href="/guidelines" target="_blank" rel="noopener noreferrer" className={linkClass}>
            Acceptable Use Policy
          </a>
          , the <strong>Code of Conduct (the five laws)</strong>, and the{" "}
          <strong>Safety &amp; Respect Guidelines</strong>. I understand and accept the{" "}
          <strong>consent model</strong> and the <strong>red lines</strong> (including no minors, no
          non-consensual content, no doxxing, and no sharing of members&apos; content outside the community),
          and that violating a red line can result in <strong>immediate, permanent termination without appeal</strong>{" "}
          and, where required, reporting to authorities.
        </span>
      </label>
    </div>
  );
}
