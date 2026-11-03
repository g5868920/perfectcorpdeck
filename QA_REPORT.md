# QA report — v3.1 (media-first path, Memory fidelity, layered rail)

Date: 2026-11-04. Chrome (headless, via puppeteer-core). Node 26.13.0, Vite 5.4.11. `tsc --noEmit` and `vite build`: **PASS**.

## P0 results

| P0 item | Result | Evidence |
|---|---|---|
| **Media-first path** (Tokyo Yakiniku — 5 Restaurants) | **PASS** | `smoke-media.mjs` **31/31**, using **real file uploads** (3 JPG + 1 MP4 through the import button) |
| ├ Import own media or labelled samples | PASS | Uploads appear as `blob:` thumbnails labelled "Yours"; samples labelled "Sample"; video duration detected |
| ├ Media shown in project and storyboard | PASS | All 7 storyboard segments show the uploaded files by name |
| ├ 5 names + notes, nothing invented | PASS | Captions contain exactly the typed names and notes; names never enter Memory or signals |
| ├ Visible scene plan from footage + brief | PASS | 7 segments with timings, captions, footage and a "simulated analysis" disclosure |
| ├ Footage in preview **and** export | PASS | The canvas renders the footage (non-black frame check); playback clock advances; the export produced a **14.2 MB `video/mp4` recording** |
| ├ Memory selects narration, captions, pacing, music, visual | PASS | Plan rows show resolved values and sources; the compositor applies the grade, transitions, caption style, music and voice |
| ├ Attribution and user control over selection/order | PASS | Reorder and remove on import; reassign per segment on the plan; re-cut in Refine |
| └ Honest fallbacks | PASS | Simulated analysis, browser-voice preview, "narration not in export" and unplayable-file notices |
| **Creator Memory fidelity** | **PASS** | `smoke-memory.mjs` **63/63**: all 10 keys × (Identity · disabled → App default · This Reel only) on the idea plan, and × (Identity · Series beats Identity · This Reel only beats Series) on the media plan |
| ├ Reported cases (Warm, Clean Minimal, Minimal transitions, <3s hook) | PASS | Each shown correctly; the hook heading says 0–3s |
| └ Live update (root-cause regression) | PASS | A Hub edit made after planning appears in the existing plan immediately |
| **Memory management** (Identity / Series / Pending) | **PASS** | One store reached from Settings, Reel Agent home and New Reel/Plan. A series-scoped suggestion with provenance → **Accept** saves to the series only (Identity unchanged). The promo-code text was **refused** with an explanation |
| **Layered presenter rail** | **PASS** | `smoke-rail.mjs` **20/20**: 4 collapsible groups tagged Existing/Proposed/QA; **Guided Demo** walks 14 steps on the correct routes with no manual state edits; hidden on phones and absent in capture mode |

## P1 end-to-end integrity (all demonstrable without dev tools)

| Scenario | Result |
|---|---|
| First-time creator can skip Memory setup | PASS (`smoke-media`, `smoke-v3` T1) |
| Existing creator edits Memory from Settings | PASS (`smoke-v3` T7) |
| Uploads actual media, reflected in storyboard | PASS (`smoke-media`) |
| Plan applies global + content-specific preferences | PASS (Series and Identity sources on the media plan) |
| Single-Reel override doesn't modify global defaults | PASS (media + T5) |
| Usable complete Reel preview | PASS (media canvas + coffee prepared Reel) |
| Targeted changes compared to the original | PASS (media re-cut + coffee Test C) |
| Ready to Use separate from publishing | PASS ("Not published" card; Draft → Ready) |
| Start another Reel with approved preferences | PASS (T4, media second Reel) |
| Repeated decisions → pending suggestions, not silent changes | PASS (T6; series-scoped in `smoke-media`) |

## Regression

| Suite | Result |
|---|---|
| Coffee scenario A/B/C + exception + reset (`smoke-journeys`) | **18/18 PASS** |
| T1–T7 entry points and Memory (`smoke-v3`) | **32/32 PASS** |
| Layout: 22 screens × 375/430/768/1440 (`smoke-layout`) | **PASS**: no overflow, frame fits, no console errors |
| Sound-blocked fallback (`smoke-autoplay`) | **PASS** |

## Screenshots (1179×2556, real app states)

`screenshots/v31-review/`:

| # | File | State |
|---|---|---|
| 1 | `1-choose-creation-mode` | Choose creation mode |
| 2a | `2a-import-empty` | Empty import |
| 2b | `2b-import-media` | Media imported (labelled samples) |
| 2c | `2c-restaurants-and-memory` | Restaurants + Memory card |
| 3a | `3a-media-agent-plan` | Media storyboard |
| 3b | `3b-media-plan-memory` | Plan with sources |
| 4 | `4-media-reel-preview` | Preview frame with footage, grade, label, caption |
| 5 | `5-media-refine` | Refine |
| 6 | `6-ready-to-use` | Ready to Use |
| 7a | `7a-memory-identity` | Memory: Identity |
| 7b | `7b-memory-series` | Memory: Series |
| 7c | `7c-memory-suggestions` | Memory: Pending |
| 8 | `8-desktop-presenter-rail` | Desktop rail + guided step (2880×1800) |

The coffee slide set `screenshots/S1…S6` and `screenshots/v3-review/` were recaptured in the current UI.

## Open items / limitations

1. The review screenshots use **sample media**, to keep them rights-safe and deterministic. The real-upload path is proven by `smoke-media` but isn't pictured. Re-capture with your own photos if you want them in the deck.
2. Media-path narration is browser speech: preview only, and the voice depends on the OS/browser. The export carries captions + music only (labelled).
3. Export is recorded in real time (about 22–28s) and needs a visible tab. Format is MP4 on current Chrome, otherwise WebM.
4. Footage analysis and the learning rule are deterministic simulations (documented in `DATA_STATE.md`).
5. Not tested in Safari or on a physical iPhone. There's no backup recording.
