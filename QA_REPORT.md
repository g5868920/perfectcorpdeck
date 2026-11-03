# QA report — Creator-Aware Reel Agent concept demo

Date: 2026-11-04. Environment: macOS 27, Google Chrome (headless via puppeteer-core) plus the in-app browser pane, Node 26.13.0, Vite 5.4.11.

Re-run everything with `npm run build && npm run smoke` (the smoke scripts need `npm run dev` running).

| Area | Result | Evidence |
|---|---|---|
| Design continuity (one light YouCam-aligned system) | **PASS** | All tokens come from `src/theme.ts`. The canvas is light and dark is used only behind the video player. The same app bar, coin pill, step bar, cards and CTAs appear on every screen (see `screenshots/`). |
| S1 Creator Signature | **PASS** | Add / edit / delete / disable work. The suggestion is saved only on **Save to Signature** (automated check). |
| S2 New Reel | **PASS** | Seeded brief; optional media input and demo samples; "Using your Creator Signature · 6 defaults"; This-Reel-only override. |
| S3 Agent Plan | **PASS** | Hook, editable script, reorderable 4-scene storyboard, settings tagged Signature / This Reel only, source plan, DEMO coin quote, confirmation sheet, Edit Plan. |
| S4 Create + complete Reel | **PASS** | 6 job stages with no percentages or durations. Real playback: narration, music and video advance together (measured drift ≤0.1s), and captions switch on cue. |
| S5 Targeted revision | **PASS** | Caption text and style update the preview. Music switch changes the audio source. Scene 02 switches to the prepared alternate, with a coin quote first. Original / Revised compare, Keep Original and Use Revision all work. |
| S6 Ready to Use / History | **PASS** | Draft vs Ready to Use are distinct. Save is enabled only after Ready to Use. Export downloads a real MP4 matching the chosen version, with the caption limitation labelled. Publishing is marked separate and later. Start Another Reel works. |
| Exception state | **PASS** | Insufficient demo coins shows "We couldn't complete this revision. Your previous Reel is safe." Edit Request, Try Again (review credits) and Keep Original all recover; nothing is charged. |
| **Test A** — Repeat creation | **PASS** | The second brief's plan reuses hook, voice, captions, music and format without retyping. |
| **Test B** — Creative override | **PASS** | Cool Night Look changes only the second Reel (cool storyboard stills). The Signature still says Warm Cinematic after a refresh. |
| **Test C** — Targeted revision | **PASS** | Edited caption, switched music and replaced Scene 02 all show in the preview. The original stays intact and comparable. The revision is saved as Ready to Use. |
| Complete playable Reel / media | **PASS** | 20s, 9:16, 4 scenes, Mandarin narration, original music, timed Traditional Chinese captions. Export loudness is about −12 dBFS with narration and music, about −25 dBFS for the music bed alone. |
| Autoplay restriction | **PASS** | When audio playback is refused (emulated), the muted video still plays and a "Sound was blocked — tap to enable" button appears. Tapping it resumes narration and music in sync (`smoke:autoplay`). Nothing autoplays; there is always a Play button. |
| Refresh / persistence / Reset Demo | **PASS** | State survives reload. Reset restores the seed: 6 defaults, 120 coins, pending suggestion, empty History. |
| Responsive (375×667, 430×932, 768×1024, 1440×900) | **PASS** | 32/32 screen × size checks: no horizontal overflow, the frame fits, no console errors (`smoke:layout`). |
| Accessibility (basic) | **PASS, with a note** | Labelled controls, `aria-pressed` / `aria-selected` on toggles and tabs, visible focus rings. Muted, violet, warn and success text are ≥4.5:1. **Note:** white text over the magenta end of the CTA gradient is 3.6:1. Most CTA text sits over the blue/indigo part (4.5–5.7:1). |
| Screenshot readiness | **PASS** | Eight PNGs, all 1179×2556 (393×852 @3x), from real app states with no browser chrome: `S1…S6`, `extra-history`, `extra-exception`. |

## Unresolved / honest limitations

1. **Caption edits are not in the exported MP4.** The four prepared exports use the original Bold White captions. The Finish screen says so in a visible warning.
2. **Re-voicing edited script lines is not simulated.** Edit Voiceover offers preview-only voice and music levels and says so.
3. **Only Scene 02 has an alternate.** Replace is disabled, with an explanation, for Scenes 01, 03 and 04.
4. **The second brief (bookstore) has no prepared video.** It produces a plan saved as a draft, which is enough for Tests A and B.
5. **Narration voice licensing:** the macOS system voice fits personal, non-commercial use (an interview demo). Check before commercial reuse.
6. **No backup screen recording.** ffmpeg isn't installed, so none was produced. Record one with QuickTime while presenting.
7. **The design is inferred from store screenshots** (v1.32.1), not official tokens. It is YouCam-inspired, not identical.
8. **Not tested on a physical iPhone or in Safari.** Testing was in Chrome only.
