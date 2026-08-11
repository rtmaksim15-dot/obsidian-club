# Obsidian Club — Registration Consent & Clickwrap Wording

**Status:** Draft for attorney + product review — not legal advice.

> Purpose: give the signup/onboarding flow legally-effective **manifestation of
> assent** (clickwrap) for the Terms, Privacy Policy, Acceptable Use Policy, Code of
> Conduct, Safety & Respect Guidelines, and the **18+** affirmation and age
> verification. Enforceability turns on **conspicuous presentation + affirmative
> action + a record of assent** — this file specifies both the wording and the UX
> requirements. `[LAWYER]` / `[PRODUCT]` notes at the end.

---

## 1. UX requirements (make the assent enforceable)

Courts enforce **clickwrap** (affirmative click on separate, unchecked checkboxes
next to conspicuous, hyperlinked terms) far more reliably than "browsewrap." Build
the flow so that:

- Each checkbox is **unchecked by default** and must be actively checked. `[PRODUCT]`
- Document names are **hyperlinks** that open the current version.
- The **"Create account" / "Enter" button is disabled** until required boxes are
  checked.
- The system **stores a record** of assent: user ID, timestamp, IP, the **version**
  of each document accepted, and which boxes were checked. `[PRODUCT]`
- The same assent is captured whether the user signs up by email or via **Google
  OAuth** (present the checkboxes on the same screen before account creation
  completes).
- **Re-consent** is prompted when any incorporated document materially changes.

## 2. Registration screen — checkbox wording

**Recommended: three required checkboxes** (bundling age + agreements is acceptable,
but separating the 18+/age affirmation strengthens it). Adjust to taste with counsel.

**☐ 1. Age and identity (required)**
> I am **at least 18 years old** (or the age of majority where I live, if higher). I
> understand access requires **age verification**, and I agree to complete it. The
> information I provide about my age and identity is **true**. I understand that
> helping anyone under 18 access Obsidian Club is a permanent, non-appealable
> violation.

**☐ 2. Terms and privacy (required)**
> I have read and agree to the [Terms of Service] and the [Privacy Policy], including
> the **binding arbitration** and **class-action waiver** in the Terms (which I may
> opt out of within 30 days as described there), and I consent to the processing of
> my information as described in the Privacy Policy.

**☐ 3. Community rules and consent (required)**
> I have read and agree to the [Acceptable Use Policy], the **Code of Conduct (the
> five laws)**, and the **Safety & Respect Guidelines**. I understand and accept the
> **consent model** and the **red lines** (including no minors, no non-consensual
> content, no doxxing, and no sharing of members' content outside the community), and
> that violating a red line can result in **immediate, permanent termination without
> appeal** and, where required, reporting to authorities.

**Primary button:** **"Create my account"** (disabled until 1–3 are checked).

Immediately under the button, a short reinforcing line (not a substitute for the
boxes):
> By creating an account you confirm you are 18+ and agree to the documents above.

## 3. Onboarding ritual — post-registration confirmation

After the account is created and **before first access to the community**, present
the mandatory onboarding acceptance as a distinct step (matches your product ritual):

**Screen A — Code of Conduct (the five laws).** Show the five laws in full; require:
> **☐ I accept the five laws and will uphold them.** `[PRODUCT: record version + timestamp]`

**Screen B — Safety & Respect Guidelines (consent, boundaries, red lines).** Show in
full; require:
> **☐ I have read the Safety & Respect Guidelines. I understand consent is required,
> revocable, and absolute, and I accept the red lines.**

**Screen C — 18+ / verification confirmation.** If verification is completed here,
show status; require:
> **☐ I confirm I am 18+ and I have completed / will complete age verification.**

Gate community entry on completion of Screens A–C. Store each acceptance with version
and timestamp. [^ritual]

## 4. Consent-to-post capture (in-product, at upload)

Because consent is central and legally protective, capture a **per-upload
affirmation** when a member posts imagery of a person:

> **☐ Everyone shown is a consenting adult (18+), and I have their specific,
> informed, revocable consent to post this here.**

Log these affirmations. This supports enforcement and evidences non-facilitation of
prohibited content. [^postconsent]

## 5. Google OAuth note

For Google sign-up, present checkboxes 1–3 **on the pre-account screen** (or an
immediate interstitial) so assent is captured **before** the account is usable — do
not rely on Google's consent screen, which covers Google's data sharing, not your
Terms. `[PRODUCT]`

## 6. Records of assent (retention)

Keep assent records (who accepted what version, when, from what IP) for the life of
the account and a reasonable period after, to prove agreement to the Terms and
arbitration clause if ever disputed. Align retention with the Privacy Policy. `[LAWYER]`

---

### Attorney-review footnotes

[^ritual]: Confirm that layering registration checkboxes + onboarding screens does not create ambiguity about *when* the contract forms; counsel may prefer the binding assent (boxes 1–3) at registration, with Screens A–C as reinforcing acknowledgments.
[^postconsent]: Per-upload consent affirmation is a strong risk-control and 230/FOSTA-supportive practice, but confirm wording doesn't imply we verify each depicted person (we rely on the poster's representation).
