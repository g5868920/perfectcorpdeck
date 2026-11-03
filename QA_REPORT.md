# QA report — v3 (YouCam integration + Creator Memory)

Date: 2026-11-04. Chrome (headless, via puppeteer-core) plus the in-app browser pane. Node 26.13.0, Vite 5.4.11. Re-run with `npm run build && npm run smoke` (needs `npm run dev`).

## New UX tests (`scripts/smoke-v3.mjs`, 32 checks)

| Test | Result | What was verified through the real UI |
|---|---|---|
| **T1** Entry flow | **PASS** | Four tabs (Explore / AI Agent / All Tools / History); Explore → Video Generator → **Create Reel** → Reel Agent → first-use offer → **Skip for Now** → New Reel with the seeded brief; skipping saves nothing |
| **T2** Conversation entry | **PASS** | AI Agent tab → "Create a complete Reel from an idea" → **Start Reel Agent**; a typed Reel request is also recognised; lands in the same New Reel with the same Memory (6 defaults) |
| **T3** Optional setup | **PASS** | Example description → 6 structured suggestions; nothing saved before review; one excluded and one edited; explicit Save stores only the reviewed values; continues to New Reel |
| **T4** Memory persistence | **PASS** | The first plan uses saved Memory; after a page refresh, a second brief reuses it with no retyping |
| **T5** One-off override | **PASS** | Cool Night Look applies only to that Reel (cool storyboard); the saved Visual Style is still Warm Cinematic after refresh; a one-off creates no suggestion |
| **T6** Continuous learning | **PASS** | One choice in one Reel → no suggestion; the same choice in 2 Reels → pending suggestion with a reason; pending doesn't change Memory; **Not Now** → snoozed, unchanged; **Dismiss** → rejected, unchanged; **Save** → Memory updated |
| **T7** Memory management sync | **PASS** | Settings → PREFERENCES → Creator Memory opens the Hub; a Hub edit shows in New Reel; "Make default" in New Reel updates the Hub; the Settings row count matches the store |
| Page errors | **PASS** | None during the run |

## Regression and quality

| Area | Result | Evidence |
|---|---|---|
| **T8** Regression (`smoke-journeys.mjs`, 18 checks) | **PASS** | Suggestion approval; first Reel through the new task-first entry; 6 stages → preview; **Test C** (caption edit visible, music switched, Scene 02 alternate, original untouched, revision saved as Ready to Use); export MP4 present; **Tests A/B**; exception shown with no charge and recovered via Try Again; Reset Demo restores the seed |
| Playback (sound-blocked fallback) | **PASS** | When audio is refused, the muted video still plays and a "tap to enable" prompt appears; tapping it resumes narration and music in sync |
| Responsive layout (`smoke-layout.mjs`) | **PASS** | 15 screens × 4 sizes (375×667, 430×932, 768×1024, 1440×900) = 60 checks: no horizontal overflow, frame fits, no console errors |
| Navigation | **PASS** | Back uses an in-app history stack with sensible fallbacks; AI Agent opens full-screen without a tab bar (as in the real app); All Tools has X close; the presenter rail is hidden on phones and in capture mode |
| Existing vs proposed clarity | **PASS** | Every proposed element carries a "Proposed" / "Concept" tag; out-of-scope existing tools explain themselves; no personal data or real balances |
| Design alignment | **PASS for review** | Matches `visual-references/`: white canvas, round indigo feature icons with HOT/NEW badges, black/lavender filter chips, coin pill, indigo segment, gradient-bordered options, Settings section bands, History tabs and filters |
| Build / typecheck | **PASS** | `tsc --noEmit` and `vite build` succeed |

## Review screenshots (`screenshots/v3-review/`, 1179×2556)

1. `1-explore.png` — YouCam-aligned Explore (Video Generator is the working entry); `1b-ai-video-create-reel.png` — the proposed Create Reel card on AI Video
2. `2-ai-agent.png` — the existing-style AI Agent with the proposed Reel prompt; `2b-ai-agent-reel-reply.png` — after tapping it
3. `3-creator-memory-hub.png` — the Hub (Saved); `3b-memory-suggestions.png` — a pending suggestion with its reason
4. `4-first-use-offer.png` — Personalize Your Reel Agent; `4b-setup-review.png` — reviewing structured suggestions before Save
5. `5-new-reel-memory.png` — New Reel with "Using Creator Memory" (View / Manage / Customize)
6. `6-agent-plan-memory.png` — the Agent Plan showing how Memory shaped each part

Extra: `extra-settings-preferences.png` — Settings → PREFERENCES → Creator Memory (proposed row).

## Open items

1. ~~Recapture slide screenshots~~ **Done after approval:** `screenshots/S1-creator-memory.png` … `S6-finish.png` plus `extra-history.png` and `extra-exception.png` are recaptured in the v3 UI (1179×2556). Slide 07 uses S1–S3; Slide 08 uses S4–S6. S6 also shows the after-finish Memory suggestion.
2. The learning rule and setup extraction are deterministic simulations (documented). There is no real model.
3. Plan-only settings (e.g. Cool Night on the coffee brief, warm narration) don't change the prepared media. They are labelled in the plan.
4. Not tested in Safari or on a physical iPhone. There's no backup recording.
5. The **dark sign-in strip** on AI Video and the **PRO banner** in Settings were left out on purpose (account and payment flows are out of scope). Confirm that's acceptable.
