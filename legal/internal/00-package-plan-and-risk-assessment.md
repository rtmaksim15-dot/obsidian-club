# Obsidian Club — Legal Documentation Package: Plan & Risk Assessment

**Status:** Draft v0.1 — planning document
**Prepared:** 2026-08-08
**Jurisdiction focus:** United States (operator in California; hosting in US)
**Target:** Cohort launch 1 October 2026

> **IMPORTANT — NOT LEGAL ADVICE.** This document and the drafts it plans are
> production-ready *starting drafts* meant to give a licensed U.S. attorney a
> high-quality base for fast finalization. They do not constitute legal advice
> and do not create an attorney–client relationship. Every item flagged
> `[LAWYER]` needs review by counsel licensed in California (and ideally with
> adult-industry / platform experience) before it goes live.

---

## 1. What this package is and how it fits together

The package has **three layers**:

1. **Public-facing contracts** the user agrees to (enforceable, posted on the
   site): Terms of Service, Privacy Policy, Acceptable Use Policy, DMCA Policy.
2. **Assent mechanics** — the clickwrap checkboxes at registration that make
   those contracts binding and capture the 18+ representation and Code of
   Conduct acceptance.
3. **Internal compliance memos** (not published; for you + counsel): §2257/2257A
   applicability analysis, Section 230 posture, and this risk assessment.

Your existing internal **Codex** (five laws, red lines, consent model) and
**Safety & Respect Guidelines** are the *substantive source of truth*. The
Acceptable Use Policy is the **legal translation** of that Codex — same rules,
worded so they are enforceable as contract terms and so they preserve your
moderation defenses. We do not replace the Codex; we wrap it.

### Deliverables (each as a separate file, English, with `[LAWYER]` footnotes)

| # | Document | Type | Published? |
|---|----------|------|-----------|
| 1 | Terms of Service | Contract | Yes |
| 2 | Privacy Policy (CCPA/CPRA) | Contract/disclosure | Yes |
| 3 | Acceptable Use / Community Guidelines | Contract | Yes |
| 4 | DMCA Policy + Designated Agent instructions | Contract/procedure | Yes |
| 5 | Registration consent / clickwrap wording | UX + legal text | In product |
| 6 | §2257 / §2257A applicability memo | Internal memo | No |
| 7 | Section 230 posture memo | Internal memo | No |

---

## 2. Key risks of the model (prioritized)

The model — invite-only, 18+, consent-centered adult UGC with explicit content
permitted — is **lawful in the U.S.**, but it sits in a heavily regulated lane.
Ranked by severity × likelihood:

### R1 — CSAM / minor access (existential). Severity: catastrophic.
Any sexual content involving a minor is a federal crime with strict liability
and **no Section 230 or First Amendment protection**. The entire access model
(invite tokens, manual age verification, 18+ ritual) is really a *risk-control
system for this one problem*. Weaknesses: manual `ageVerified` by an admin is
**not** reliable identity/age verification and won't satisfy the state
age-verification statutes below, nor will it protect against a determined minor.
**Mitigations to build in:** mandatory reporting pipeline to NCMEC
(18 U.S.C. §2258A applies to providers), image hashing/scanning at upload,
a hard red line + immediate termination + preservation obligations, and moving
to a third-party age/ID provider **before** relying on self-attestation at scale.

### R2 — State age-verification laws (high, and moving fast). Severity: high.
In *Free Speech Coalition v. Paxton* (decided **June 27, 2025**), the U.S.
Supreme Court **upheld** Texas's law requiring age verification for sites where
a threshold share of content is "harmful to minors," applying **intermediate**
(not strict) scrutiny. This green-lit a wave of state laws. As of 2026, numerous
states (e.g., Texas, Louisiana, Tennessee, Utah, Virginia, and many more) have
**in-effect** age-verification mandates for adult/sexual-content sites, several
with **AG enforcement and/or private rights of action** and steep per-day / per-
minor penalties. **California** is on a different track — app-store / OS-level
age-signal approach, with partial enforcement phasing in from ~2026 and more in
2027. **Implication:** a platform serving explicit content to a U.S. audience
likely needs **real age verification (ID or third-party age-assurance)**, not
just a self-checkbox, at least for users in covered states — and possibly to
geo-gate or verify everyone. `[LAWYER]` must map which states' statutes reach a
private, invite-only community and whether your "not a porn site" framing changes
the threshold analysis. This is the single most time-sensitive gap for an
October launch.

### R3 — §2257 / §2257A record-keeping (high if misjudged). Severity: high.
Federal law requires **producers** of visual depictions of *actual* sexually
explicit conduct to keep performer age/ID records and post a compliance
statement (2257A covers *simulated* conduct). The unresolved question for you:
does an operator that hosts user-uploaded explicit photos become a **"secondary
producer"** with record-keeping duties? The regulatory history is contested and
the definition has swung with litigation and DOJ rulemaking. A platform cannot
safely assume "it's just UGC, so it doesn't apply." **Options** (detailed in the
memo): (a) prohibit content that triggers 2257 (no depictions of actual sexually
explicit conduct), (b) require and retain 2257-grade records for any such
content, or (c) a hybrid with performer self-certification + retained ID. Each
has cost/UX tradeoffs. `[LAWYER]` decision needed early because it shapes the AUP
and the product upload flow. Penalties are **criminal**.

### R4 — Section 230 + FOSTA-SESTA boundary (medium-high). Severity: high if crossed.
Section 230 protects you from liability for **user-generated** content and for
**good-faith moderation** — this is core to running a UGC platform. But **FOSTA-
SESTA (2018)** carves out sex-trafficking and knowingly facilitating
prostitution: §230 does **not** immunize that. A community with explicit content
and messaging must be structured so it is clearly **not** a venue for commercial
sexual services. Practices that *preserve* 230 (don't materially contribute to
illegality, act on knowledge, keep neutral tools) are spelled out in the memo.

### R5 — Arbitration / class-waiver / "no appeal" enforceability (medium). Severity: medium.
You want binding arbitration, a class-action waiver, and termination on red-line
breach **without appeal**. Arbitration + class waivers are generally enforceable
under the FAA, but **California** scrutinizes consumer arbitration hard
(unconscionability, mass-arbitration fee rules, *McGill* rule on public
injunctive relief). "No appeal / no cure" termination is fine as a contract term,
but you should preserve **discretion** (not a promise) and avoid language that
converts moderation choices into breach-of-contract exposure. `[LAWYER]` to tune
severability and the arbitration carve-outs.

### R6 — Privacy / CCPA-CPRA + sensitive data (medium). Severity: medium.
You collect email, name, photos, an age-verification flag, and IP/rate-limit
logs. Photos in this context plus the nature of the community can make inferences
that look like **sensitive personal information** under CPRA, and (later) ID-based
age verification adds high-risk data. Requirements: privacy policy with the CPRA
notice-at-collection, rights (know/delete/correct/opt-out), "Do Not Sell/Share"
posture (you likely don't sell — say so), data-processing terms with Supabase /
Vercel / Resend as **service providers**, and a retention schedule (note the
tension with any 2257 7-year retention). `[LAWYER]` on whether a §1798 "sensitive
PI" limitation notice is triggered.

### R7 — Invite-token / sponsorship mechanics (low-medium legal, high ops). Severity: low-med.
The sponsor/vouching record is a liability-allocation and evidence question:
what does a sponsor represent, and does recording sponsorship create duties or
defamation/privacy exposure between members? The ToS should define the
invite-token grant as revocable, non-transferable, and not a property right, and
disclaim member-to-member liability.

### R8 — Payments / "not selling access" characterization (low, watch). Severity: low.
Keeping the platform **free** and monetizing **Toros goods** separately is
cleaner than selling status/access. Preserve that separation explicitly so the
invite-with-purchase mechanic isn't recharacterized as "paying for entry to adult
content," which could pull in additional consumer-protection and (in some states)
adult-content-commerce rules. Future paid tools (storage, spaces) should be sold
as **tools**, not as access tiers.

---

## 3. Cross-cutting drafting principles

- **Consent is the spine.** Every document reinforces: affirmative consent,
  revocable boundaries, hard red lines, 18+ only. This is both ethics and legal
  defense (it's evidence you don't facilitate the prohibited).
- **Two-audience writing.** Public docs readable by members; memos frank for
  counsel. Red lines appear in *both* the AUP (as rules) and the memos (as risk).
- **Preserve discretion, avoid promises.** Moderation and termination framed as
  rights we *may* exercise, not duties — this protects 230 and limits contract
  claims.
- **Every legally load-bearing choice gets a `[LAWYER]` footnote** rather than a
  confident assertion, so counsel finalizes fast.

---

## 4. Open parameters needed before drafting the documents

These change document substance and are being confirmed with the founder:
legal entity + governing-law state; DMCA/privacy contact details and a physical
address; arbitration provider preference and how aggressive to be given CA;
whether §2257-triggering content (actual sexually explicit conduct) will be
**allowed** or **prohibited** at launch; and output format (Markdown vs .docx).

---

## 5. Sources (current-law checks, Aug 2026)

- Free Speech Coalition, Inc. v. Paxton, No. 23-1122 (U.S. June 27, 2025) — SCOTUS opinion.
- Congressional Research Service, "Supreme Court Upholds State Age-Verification Requirement," LSB11354.
- Perkins Coie, analysis of FSC v. Paxton implications for websites.
- State age-verification tracker (2026), AgeOnce / AVPA compilations.
- 18 U.S.C. §2257, §2257A; EFF Internet Law Treatise, 2257 Reporting Requirements; DOJ 2257/2257A guidance.
- U.S. Copyright Office, DMCA Designated Agent Directory FAQ ($6 fee; 3-year renewal).
