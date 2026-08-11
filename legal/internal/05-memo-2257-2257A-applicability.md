# Internal Memo — Applicability of 18 U.S.C. §2257 / §2257A to Obsidian Club

**To:** Founder / counsel
**Re:** Federal record-keeping duties for adult visual content on a UGC platform
**Date:** 2026-08-08
**Status:** Draft analysis for counsel — **not legal advice; not for publication**

> This memo frames the §2257 question so counsel can decide quickly. It is written
> to be read alongside the Acceptable Use Policy (which currently **prohibits actual
> sexually explicit conduct**) and the incident/reporting SOP. `[LAWYER]` = decision
> point.

---

## 1. Executive summary

- **§2257** requires *producers* of visual depictions of **actual** sexually
  explicit conduct to create and maintain records verifying each performer's name
  and date of birth (via government ID), index them, retain them (7 years / 5 years
  after ceasing), and post a compliance statement. **§2257A** extends an analogous
  regime to **simulated** sexually explicit conduct, with a certification-based
  **safe harbor** for certain regularly-regulated producers. Violations are
  **criminal**.
- The **trigger** is the content, not the business model: "sexually explicit
  conduct" under 18 U.S.C. §2256(2) includes actual intercourse, oral/anal sex,
  masturbation, bestiality, sadomasochistic abuse, **and lascivious exhibition of
  the genitals or pubic area.** Mere nudity that is not "lascivious exhibition" is
  outside it.
- **Recommended posture (matches current AUP): keep the Platform out of §2257
  producer status by prohibiting content that depicts actual sexually explicit
  conduct**, including lascivious genital exhibition, and by moderating to that line.
  This is the lowest-cost, lowest-risk path for launch. The residual risk is the
  **"secondary producer"** question and the fuzziness of the "lascivious exhibition"
  line. `[LAWYER]` to confirm the boundary and the posture.

## 2. The statutes, briefly

**§2257 — actual conduct.** A "producer" of any book, magazine, film, videotape,
digital image, or digitally-/computer-manipulated image of **an actual human being
engaged in actual sexually explicit conduct** must: obtain and record the
performer's legal name, date of birth, and any aliases; keep a copy of a
government-issued photo ID; keep a copy of the depiction and its production date/URL;
index records by name and cross-reference; retain them (generally 7 years, and 5
years after ceasing to produce); make them available for inspection; and affix a
**compliance statement** (the "2257 label") to the material or, online, on each
relevant page.

**§2257A — simulated conduct.** Enacted by the Adam Walsh Act (2006, effective
2009), it applies parallel duties to depictions of **simulated** sexually explicit
conduct and lascivious exhibition, but provides a **certification safe harbor**:
producers whose work is regularly subject to certain regulatory regimes (and who do
not collect performer info in the ordinary course beyond age) can certify to the
Attorney General instead of maintaining §2257-style records. This safe harbor was
designed mainly for mainstream film/TV and does **not** neatly fit a UGC platform.
[^2257A-safeharbor]

**"Sexually explicit conduct" (§2256(2)(A)):** (i) sexual intercourse (genital-
genital, oral-genital, anal-genital, oral-anal), whether opposite- or same-sex;
(ii) bestiality; (iii) masturbation; (iv) sadistic or masochistic abuse; or
(v) **lascivious exhibition of the anus, genitals, or pubic area** of any person.
The last prong is the one that can pull "nudity" into scope. [^lascivious]

## 3. Who is a "producer"? Primary vs. secondary

- **Primary producer:** the person who actually films/photographs/creates the
  depiction, or who hires/arranges/manages the performer.
- **Secondary producer:** historically, one who publishes, reproduces, or
  **inserts/manages** the sexually explicit content on a website or service. DOJ's
  regulations (28 C.F.R. Part 75) at times swept in anyone who "manages the
  sexually explicit content of a computer site or service." Litigation
  (*Sundance v. Reno*; *Free Speech Coalition v. Gonzales / Holder*; the Sixth
  Circuit's *Connection Distributing* line) has narrowed and contested these rules,
  and the regime has been subject to First and Fourth Amendment challenges. Pure
  **service providers** — hosting, transmission, and generic services — are
  generally **not** producers. [^secondary]

**Why this matters for Obsidian Club:** if the Platform *allowed and displayed*
user-uploaded depictions of actual sexually explicit conduct, there is a
non-trivial argument it "manages the sexually explicit content" of the site and
could be treated as a **secondary producer** with record-keeping duties — an
untenable operational and criminal-risk burden for a UGC service. The clean answer
is to **not host that content category at all**, which is the current AUP posture.

## 4. Application to the confirmed model

**Confirmed content policy:** nudity/erotica permitted; **actual sexually explicit
conduct prohibited.** If enforced to the federal line, the Platform hosts no
category that triggers §2257 primary/secondary producer duties.

**Two caveats that need counsel sign-off:**

1. **The "lascivious exhibition" prong.** "Nudity" and "lascivious exhibition of
   the genitals/pubic area" are **not** the same, but they overlap at the margins.
   Courts use multi-factor tests (e.g., the *Dost* factors) to decide when a display
   of the genitals is "lascivious." If members post close, focus-on-genitals erotic
   imagery, some of it could be argued into §2256(2)(A)(v) and therefore §2257
   territory. **The AUP must draw a moderatable line, and moderators must enforce
   it.** `[LAWYER]` to define the operational boundary (what nudity is allowed vs.
   what crosses into lascivious genital exhibition). [^dost]

2. **Simulated conduct / §2257A.** If the Platform permits imagery depicting
   *simulated* sexual conduct or lascivious exhibition, §2257A is implicated. The
   safe harbor is a poor fit for UGC, so the practical mitigation is again to
   **exclude** such content by policy, or to treat it the same as actual conduct for
   moderation purposes. `[LAWYER]`.

## 5. Options and recommendation

**Option A — Exclusion posture (recommended, and current AUP).** Prohibit content
depicting actual (and simulated) sexually explicit conduct, including lascivious
genital exhibition. Moderate to the line. Keep a **voluntary compliance statement**
on the site describing the policy and stating that the Platform does not host
2257-covered content, plus internal documentation of the moderation standard.
- *Pros:* avoids record-keeping/criminal exposure; simplest UX; consistent with the
  "not a porn site" manifesto.
- *Cons:* requires disciplined moderation of the lascivious-exhibition margin;
  narrows content vs. some competitors.

**Option B — Permissive posture with full §2257 compliance.** Allow covered content
but require, before any such upload, verified performer identity/age records for
**every** identifiable person, retained and indexed per §2257, with the compliance
statement posted, a designated records custodian, and inspection readiness.
- *Pros:* broader content.
- *Cons:* heavy legal/operational burden; criminal exposure if imperfect;
  effectively turns the Platform into a regulated adult producer; inconsistent with
  the current brand and age-verification-lite launch. **Not recommended for launch.**

**Recommendation:** Launch under **Option A**. Revisit only with counsel if the
product direction changes. `[LAWYER]` to (i) confirm Option A removes §2257/2257A
producer status, (ii) finalize the lascivious-exhibition boundary in the AUP and
moderation guide, and (iii) approve the wording of the voluntary compliance
statement.

## 6. Draft voluntary "compliance statement" (Option A)

> *For the site footer / a dedicated /2257 page:*
>
> **18 U.S.C. §2257 Statement.** Obsidian Club is a private, invitation-only
> community for verified adults. The Platform does **not** produce, and does not
> permit members to post, visual depictions of actual or simulated sexually explicit
> conduct as defined in 18 U.S.C. §2256(2). Content on the Platform is
> user-generated; Obsidian Club acts as an online service provider and not as a
> "producer" within the meaning of 18 U.S.C. §§2257, 2257A. Members are solely
> responsible for content they post and must comply with the Acceptable Use Policy.
> Questions: [LEGAL EMAIL]. [^statement]

## 7. Related duties not covered by §2257 (flag)

Even under Option A, the Platform still has **CSAM obligations** independent of
§2257: if it obtains actual knowledge of apparent child sexual abuse material, it
must report to NCMEC under **18 U.S.C. §2258A** and preserve per §2258A(h). Build the
reporting/preservation SOP regardless of the §2257 posture. `[LAWYER]` / ops.

---

### Attorney-review footnotes

[^2257A-safeharbor]: Confirm the §2257A certification safe harbor is unavailable/ill-suited here and that Option A (exclusion) is the intended path rather than certification.
[^lascivious]: The inclusion of "lascivious exhibition of the genitals or pubic area" in §2256(2)(A)(v) is the crux — it means some "nudity" can be covered. Counsel to confirm current statutory text and any post-2025 amendments.
[^secondary]: The secondary-producer regulations (28 C.F.R. Part 75) and their litigation history are contested; confirm the current state of the regulations and case law in the operative circuit (Ninth, for a CA operator) before relying on "service provider" status.
[^dost]: Recommend counsel provide a short moderator rubric operationalizing the *Dost*-style factors so front-line moderation can consistently apply the allowed-nudity vs. prohibited-lascivious-exhibition line.
[^statement]: Voluntary statement is a risk-communication tool, not a statutory requirement under Option A; counsel to approve wording so it doesn't inadvertently assert producer status or make inaccurate representations.
