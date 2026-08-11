# Internal Memo — Section 230 Posture & Moderation Practices to Preserve It

**To:** Founder / counsel
**Re:** What Section 230 protects for Obsidian Club, and the practices that keep it
**Date:** 2026-08-08
**Status:** Draft analysis for counsel — **not legal advice; not for publication**

---

## 1. Executive summary

- **Section 230(c)(1)** (47 U.S.C. §230) means Obsidian Club, as an "interactive
  computer service," generally **cannot be treated as the publisher or speaker** of
  content its members create. This is the core shield for a UGC community: it blocks
  most claims (defamation, many tort theories) premised on **user** content.
- **Section 230(c)(2)** protects **good-faith moderation** — removing or restricting
  objectionable content — so moderating **does not** forfeit the shield. You can
  curate heavily and still be protected.
- **The limits that matter here:** §230 does **not** cover (a) **federal criminal
  law** (e.g., CSAM statutes), (b) **intellectual property** claims (handled via
  DMCA), and (c) **sex-trafficking / knowing facilitation of prostitution** under the
  **FOSTA-SESTA** carve-out (§230(e)(5)). For an adult platform, **(a) and (c) are the
  live risks** — and they are exactly what the red lines and consent model are built to
  keep out.
- **Bottom line:** keep the Platform clearly a UGC host that does **not materially
  contribute** to unlawful content, moderate in good faith, act on knowledge, and keep
  tools neutral. Do that and §230 protection is strong for the ordinary run of member
  disputes; the residual exposure is criminal/CSAM and trafficking, which are governed
  by other law and by operational discipline, not by §230.

## 2. What §230 protects

**(c)(1) — publisher immunity.** No provider of an interactive computer service shall
be treated as the publisher/speaker of information provided by **another** information
content provider. Practical effect: claims that seek to hold you liable *as if you
wrote or published* a member's post are generally barred — defamation, negligent
publication, most privacy/tort theories predicated on hosting user content.

**(c)(2) — Good Samaritan moderation.** No liability for **good-faith** actions to
restrict access to material the provider considers obscene, lewd, lascivious, filthy,
excessively violent, harassing, or **otherwise objectionable** — even if
constitutionally protected. This is why aggressive moderation, labeling, and removal
**do not** cost you the shield.

## 3. What §230 does NOT protect (the carve-outs)

1. **Federal criminal law (§230(e)(1)).** §230 is no defense to federal crimes,
   including child sexual abuse material (18 U.S.C. §§2251–2252A, 2258A reporting) and
   obscenity. → Governed by the red lines + NCMEC reporting SOP.
2. **Intellectual property (§230(e)(2)).** No §230 defense to IP claims; copyright is
   handled through **DMCA §512 safe harbor** (see DMCA policy).
3. **Electronic Communications Privacy Act** and certain other statutes (§230(e)(4)).
4. **FOSTA-SESTA (§230(e)(5), 2018).** Removes §230 immunity for civil claims and
   state prosecutions under **18 U.S.C. §1591 (sex trafficking)** and **§2421A
   (knowingly facilitating prostitution)**, and for related conduct. This is the
   single most important §230 limit for an adult community. → Governed by the AUP's
   prohibition on commercial sexual services/trafficking and non-facilitation
   practices below.

## 4. Where protection can be LOST (and how to avoid it)

**a. Becoming a co-developer of the content.** If the Platform **materially
contributes** to the illegality of content — e.g., by *requiring* or *inducing*
unlawful posts, or designing prompts/dropdowns that solicit illegal offers
(*Roommates.com*) — it becomes an "information content provider" and loses (c)(1) for
that content. → **Keep tools neutral**: do not build features that solicit or
structure commercial-sex offers, ages, or non-consensual content; neutral posting
tools are protected even when misused.

**b. Trafficking/prostitution facilitation (FOSTA-SESTA).** Knowingly assisting,
supporting, or facilitating sex trafficking or prostitution is outside §230 and is a
crime. → **Design against it**: AUP bans commercial sexual services; no features for
advertising services or arranging paid encounters; act on reports; don't turn a blind
eye. Avoid "knowing" facilitation — respond to red-flag content.

**c. Bad-faith or pretextual moderation.** (c)(2) requires **good faith**. → Moderate
per stated policies, consistently; keep the "rights not duties / objectionable
content" framing in the Terms and AUP.

**d. First-party content.** §230 does not protect content **we** create (official
posts, our own statements). → Keep staff/brand content accurate; it's outside the
shield.

**e. Promises that create contract duties.** Over-promising to remove or police
content can create **contract** claims that some courts treat as outside §230
(promissory-estoppel theories). → Terms/AUP use discretionary language ("we may, not
must"), avoiding enforceable promises to moderate.

## 5. Practices that preserve §230 (checklist)

- **Neutral, general-purpose tools** for posting, chat, and spaces — nothing that
  solicits or structures illegal transactions or non-consensual content.
- **Good-faith, policy-based moderation**, applied consistently; document standards.
- **Act on knowledge / red flags**, especially for CSAM, non-consensual imagery, and
  commercial-sex solicitation; maintain fast reporting channels ([SAFETY EMAIL]).
- **CSAM SOP**: preserve + report to NCMEC under §2258A; never "investigate" in a way
  that creates possession/distribution exposure — follow counsel's protocol.
- **Discretionary language** in Terms/AUP ("may," "at our discretion," "no duty to
  monitor") to avoid contract-based end-runs around §230.
- **Separate IP handling** via DMCA agent + safe-harbor process.
- **Don't co-author**: avoid features, prompts, or curation that materially contribute
  to unlawful content.
- **Keep first-party content clean** (it's unprotected).
- **Record moderation decisions** to evidence good faith.

## 6. Interaction with the rest of the package

- The **AUP red lines** (minors, non-consensual, commercial sexual services, doxxing,
  leaking) are the operational implementation of the §230 carve-outs — they keep the
  Platform out of the unprotected zones.
- The **Terms'** discretionary moderation/termination language preserves (c)(2) and
  avoids contract exposure.
- The **DMCA policy** covers the IP carve-out.
- The **§2257 memo** covers a different federal regime (record-keeping), not §230.

## 7. Open items `[LAWYER]`

- Confirm current state of §230 case law in the **Ninth Circuit** (CA operator),
  including any post-2024 developments narrowing (c)(1)/(c)(2) or expanding
  product-liability/"defective design" theories against platforms.
- Confirm FOSTA-SESTA compliance posture and whether any additional state-law adult-
  platform obligations apply.
- Confirm the CSAM reporting/preservation SOP aligns with §2258A and does not create
  an affirmative-monitoring obligation the statute doesn't require.
- Validate that no product feature could be argued to "materially contribute" to
  unlawful content.
