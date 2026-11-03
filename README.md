# Creator-Aware Reel Agent — concept demo (YouCam AI Pro–inspired)

A clickable, stateful prototype of a *proposed* feature for a Perfect Corp. App PM interview. It is **not** a shipped YouCam / Perfect Corp feature, uses no YouCam logos or screenshots, and runs entirely in the browser.

**Flow:** S1 Creator Signature → S2 New Reel → S3 Agent Plan → S4 Create + complete Reel preview → S5 Refine → S6 Finish / History, plus one recoverable exception state.

## Run

Node is installed locally at `~/.local/node-v26.13.0-darwin-arm64`, not system-wide.

```bash
export PATH=~/.local/node-v26.13.0-darwin-arm64/bin:$PATH
npm install
npm run dev              # http://127.0.0.1:5173  (desktop shows the presenter rail + app frame)
npm run build            # typecheck (tsc) + production build to dist/
npm run typecheck
npm run smoke            # needs `npm run dev` running: journeys A/B/C + exception, layout at 4 sizes, sound-blocked fallback
npm run capture          # needs `npm run dev` running: writes 1179×2556 PNGs to screenshots/
```

**Reset Demo:** use the presenter rail on desktop, or the History tab → Reset Demo. Either one restores the seeded Signature, 120 demo coins and an empty History.

## Presenting and capturing

| What | How |
|---|---|
| Live demo on a projector | Open `http://127.0.0.1:5173`. The app frame scales to the screen height, and the left rail jumps to any screen. |
| Phone-size view | Any window narrower than 600px shows the app full-bleed, without the rail. |
| Chrome-free app view | Add `?capture` (e.g. `?capture#/refine`). |
| Deterministic screen states | Add `?scenario=s1` … `s6` or `err` (see `src/state.ts → buildScenario`). |
| Slide screenshots | `npm run capture` saves `screenshots/S1…S6` plus `extra-history.png` and `extra-exception.png`. Slide 07 uses S1–S3; Slide 08 uses S4–S6. |

The presenter rail also has **Set low (5)** / **Restore** demo-coin buttons, so you can show the exception through the real Replace Scene flow.

## Real vs simulated

| Real (genuinely works) | Simulated (disclosed in the UI) |
|---|---|
| Signature add / edit / delete / disable; saved in localStorage across refreshes | The "short opening hooks" suggestion is scripted demo content, not behavior modeling |
| The suggestion is saved only on **Save to Signature**; **Not Now** discards it | The agent plan is deterministic from the seed brief and profile |
| This-Reel-only overrides live on the project and never change the Signature | Production stages (Script → … → Assembly) are paced animation with no progress % or time claims |
| Script editing, scene reordering, confirmation sheets | "Generation" plays prepared media (*"Concept demo — AI generation simulated with prepared media."*) |
| **Playback:** 20s, 9:16, 4 scenes, audible Mandarin narration, audible music, timed Traditional Chinese captions | All coin amounts are **DEMO / illustrative**, not YouCam prices; there are no payments |
| Caption text and style edits update the live preview instantly | Replace Scene 02 swaps to a *prepared* alternate clip (the UI says so) |
| Music switch is audible (two different tracks) | Re-voicing rewritten narration is **not** simulated (the UI says so) |
| Original / Revised compare, Keep Original, Use Revision; the original is never modified | The exception state (insufficient demo coins) is triggered on purpose |
| Ready to Use, saving to History, and **Export Video** downloads a real MP4 matching the scene and music choice | Bookstore brief: plan only. No prepared video exists for it, so it is saved as a draft plan |

**Export limitation (shown in the UI):** there are four prepared exports (Scene 02 original/alternate × two music tracks). Each has burned-in **original** Bold White captions. Caption text and style edits are preview-only and are not in the downloaded file.

## Media provenance (`public/media/`)

Everything was **created for this demo on this machine**. There are no stock, scraped or third-party assets.

| Asset | Source | Rights |
|---|---|---|
| Scenes 1–4, Scene 02 alternate, bookstore stills (warm and cool) | Procedural illustrations drawn in code: `media-src/render.swift` (CoreGraphics) | Original work |
| "Mellow Lo-fi", "Bright Acoustic" | Synthesized from math in `media-src/music.py` (no samples) | Original work |
| Mandarin narration (`voiceover.m4a`) | macOS built-in `say` voice **Meijia (zh_TW)** | Apple's macOS licence allows system-voice output for **personal, non-commercial** projects. That fits an interview demo; check Apple's terms before any commercial use |
| Captions (`captions.json`) | Script text, timed from measured narration durations | Original |
| `preview-*.mp4` (silent visuals), `reel-*.mp4` (full mixed exports) | Assembled with AVFoundation in `render.swift` | Original |

To regenerate the media (macOS):

```bash
cd media-src
python3 music.py build
swiftc -O -swift-version 5 render.swift -o build/render
./build/render "$PWD/build" "$PWD/../public/media" all
```

The narration clips `build/vo1–4.aiff` come from `say -v Meijia -r 165`; the four lines are in `src/state.ts → COFFEE_SCRIPT`.

## Design

See `YOUCAM_UI_AUDIT.md`. The look is fully light, with dark surfaces only behind video. Visual tokens live in `src/theme.ts`. It is YouCam-*inspired*, not identical, and the values are inferred rather than official design tokens.

## Known limitations

- Only the coffee brief has playable media. Other briefs produce a plan saved as a draft.
- Caption edits are preview-only in exports (see above). Voice and music level sliders are preview-only.
- Only Scene 02 has a prepared alternate. Replace is disabled for other scenes, with an explanation.
- Demo state lives only in this browser's localStorage. This is not cloud storage.
- `public/media` is about 59 MB (four 20s exports plus two preview videos).
- No backup screen recording is included (no ffmpeg on this Mac). Record one with QuickTime → New Screen Recording while running the demo.
