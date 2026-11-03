# Creator-Aware Reel Agent — concept demo (inside a YouCam AI Pro–style app)

A clickable, stateful prototype of a *proposed* feature for a Perfect Corp. App PM interview. It is **not** a shipped YouCam / Perfect Corp feature. It uses no YouCam logo files or screenshot backgrounds, runs entirely in the browser, and stores only synthetic demo data.

**v3.1 status: review checkpoint.**
- A **media-first** creation path (Tokyo Yakiniku — 5 Restaurants).
- Fixed **Creator Memory fidelity** between Memory and the Agent Plan.
- **Content/Series** preferences.
- A layered **presenter rail** with a Guided Demo.

All earlier features still work, including the coffee example.

## Run

Node is installed locally at `~/.local/node-v26.13.0-darwin-arm64`, not system-wide.

```bash
export PATH=~/.local/node-v26.13.0-darwin-arm64/bin:$PATH
npm install
npm run dev            # http://127.0.0.1:5173
npm run build          # typecheck (tsc) + production build to dist/  (⚠ empties dist/)
npm run capture:v31    # v3.1 review screenshots → screenshots/v31-review/
npm run capture        # all capture states (incl. the S1–S6 coffee slide set)
```

The tests need `npm run dev` running:

```bash
npm run smoke:memory   # every preference key × every precedence case (63 checks)
UPLOAD_DIR=/folder/with/a/few/jpg-or-mp4 npm run smoke:media   # media path with REAL uploads (31 checks)
npm run smoke:v3       # T1–T7 entry points + Creator Memory (32)
npm run smoke:journeys # coffee regression A/B/C + exception + reset (18)
npm run smoke:rail     # layered rail + guided demo (20)
npm run smoke:layout   # 22 screens × 4 sizes
npm run smoke:autoplay # sound-blocked fallback
```

**Reset Demo:** presenter rail → 04 Demo / QA Utilities, or History → Reset Demo. This clears localStorage and on-device media.

## Two creation modes (shared Memory, Plan, review, refine, Ready to Use)

| Mode | What the creator does | What's real |
|---|---|---|
| **A. Use My Photos & Videos** (primary) | Imports their own photos/clips (or labelled **sample media**), picks the order, types **5 restaurant names** (+ optional area and notes), chooses a content series | The storyboard, preview and export use **the actual imported footage**, assembled in the browser. Captions use only what they typed |
| **B. Start from an Idea** | Types a topic | Prepared coffee Reel (owned media), as before |

**Media path honesty:**
- **Footage matching:** "analysis" is a simple rule (a clip opens, then the import order) and is labelled *simulated*. The creator can reassign any segment.
- **Narration:** in the preview it uses the **browser's built-in Mandarin voice**. The **export is recorded in real time** (canvas + music → MP4 in Chrome, otherwise WebM) and **does not include** browser narration. Both are labelled in the UI.
- **Sample media** are original illustrations, labelled "Sample — not a real restaurant". The pre-filled names (示範燒肉 A–E) are obviously fictional.
- **Uploads** stay on the device (IndexedDB) and survive refresh.

## How it fits the real app

| Path | What happens |
|---|---|
| Explore → Video Generator → **Create a Complete Reel with AI Agent → Create Reel** | Reel Agent home → **Choose Creation Mode** |
| AI Agent → **"Create a complete Reel from an idea"** (or type a Reel request) | **Start Reel Agent** → same home |
| All Tools → AI Video → **Reel Agent** | Same home |
| Settings → PREFERENCES → **Creator Memory**, Reel Agent home → Creator Memory, New Reel / Plan → **Manage Memory** | One Memory Hub, one store |

## Creator Memory (one store, three layers)

- **Creator Identity:** global long-term defaults in 9 categories. Add, edit, delete, disable.
- **Content / Series preferences:** *Travel & Food* and *Sponsored Beauty*. These apply only to Reels in that series, on top of Identity. Sponsored campaign details live in each Reel's brief and are **never** stored.
- **Pending AI suggestions:** each has its reason, provenance (which Reels, and how the choice was made) and the scope it would save to. The choices are **Accept / Not Now / Reject**.
- **Manage:** noticed choices (clearable), rejected suggestions (Reconsider), and a change log.
- **Precedence**, shown on every plan row: **This Reel only → Series → Creator Identity → App default**.
- **Guardrail:** contact details, product claims, campaign/brand instructions and customer info are refused from Memory, with an explanation. Restaurant names and notes, one-off overrides and campaign notes never become Memory or learning signals.

See **`DATA_STATE.md`** for the full state model, resolution logic and learning rule.

### Memory fidelity fix (v3.1)

**What went wrong:** the plan used to read a snapshot taken when "Plan My Reel" was tapped. Memory edited after that (Hub, Settings, Manage) wasn't reflected. That caused Warm↔Neutral, Clean Minimal↔Bold White, Minimal↔Standard, and a <3s hook shown as 4s. App defaults also appeared unlabelled.

**The fix:**
- Plans now **resolve live**, and every row shows its value **and** source.
- `project.applied` is frozen only at Approve & Generate.
- Covered by `scripts/smoke-memory.mjs`.

## Real vs simulated

| Real (genuinely works) | Simulated (disclosed in the UI) |
|---|---|
| File import (images/videos), ordering, removal, slot reassignment, IndexedDB persistence | Footage "analysis" / scene matching (rule-based) |
| In-browser assembly of the creator's footage: Memory grade, pacing transitions, info labels, captions, music | Narration with the browser voice (preview only); the agent's plan wording is rule-based |
| Real-time recorded export of the media Reel (MP4/WebM, captions + music) | Coin costs are DEMO / illustrative; no payments |
| Memory: Identity, Series, suggestions (Accept / Not Now / Reject), guardrail, live resolution | The learning rule is deterministic (same choice in 2 Reels); the "short hooks" suggestion is seeded demo history |
| Coffee path: prepared 20s Reel, revisions, compare, prepared MP4 export | Coffee "generation" plays prepared media; Scene 02's alternate is prepared |
| Ready to Use, History, Reset Demo, exception recovery | Existing YouCam tools outside the concept show an "out of scope" note |

## Media provenance (`public/media/`)

Everything was created for this demo on this machine. There are no stock, scraped or third-party assets.

- **Coffee scenes and yakiniku sample media** (6 stills, 2 clips): procedural CoreGraphics illustrations in `media-src/render.swift` and `media-src/yakiniku.swift`. Original work; no real restaurants, people or logos.
- **Music:** synthesized from math (`media-src/music.py`).
- **Coffee narration:** macOS `say` voice **Meijia (zh_TW)**. Fine for a personal, non-commercial interview demo; check Apple's terms before commercial use.
- **Media-path narration:** the viewer's own browser speech voice at runtime. Nothing is stored or shipped.

To regenerate the media (macOS):

```bash
cd media-src && python3 music.py build && cp render.swift build/main.swift \
  && swiftc -O -swift-version 5 build/main.swift yakiniku.swift -o build/render \
  && ./build/render "$PWD/build" "$PWD/../public/media" all && ./build/render "$PWD/build" "$PWD/../public/media" yakiniku
```

## Design

See `YOUCAM_UI_AUDIT.md`, which is based on Gina's screenshots in `visual-references/` and covers existing vs proposed and the v3.1 additions. Tokens live in `src/theme.ts`.

## Known limitations

- One media scenario: yakiniku, 5 spots, 7 segments. One prepared idea scenario: coffee. The bookstore idea brief is plan-only.
- The media export omits narration (browser speech can't be recorded) and runs in real time (about 25s). Some phone codecs (e.g. HEVC .mov) may not decode in every browser; unplayable files are skipped with a notice.
- Coffee exports keep the original Bold White captions; caption edits are preview-only.
- Tested in Chrome only (headless + in-app browser), not Safari or a physical iPhone. There's no backup screen recording.
