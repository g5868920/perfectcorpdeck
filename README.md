# Creator-Aware Reel Agent — concept demo (inside a YouCam AI Pro–style app)

A clickable, stateful prototype of a *proposed* feature for a Perfect Corp. App PM interview. It is **not** a shipped YouCam / Perfect Corp feature. It uses no YouCam logo files or screenshot backgrounds, runs entirely in the browser, and stores only synthetic demo data.

**v3 status: UI/UX review checkpoint.** The Reel Agent is integrated into recreated YouCam AI Pro surfaces (from `visual-references/`), and Creator Memory has been added. All earlier features still work.

## Run

Node is installed locally at `~/.local/node-v26.13.0-darwin-arm64`, not system-wide.

```bash
export PATH=~/.local/node-v26.13.0-darwin-arm64/bin:$PATH
npm install
npm run dev            # http://127.0.0.1:5173
npm run build          # typecheck (tsc) + production build to dist/  (⚠ empties dist/)
npm run smoke          # needs `npm run dev`: T1–T7, T8 regression (A/B/C + exception), layout at 4 sizes, sound-blocked fallback
npm run capture:v3     # needs `npm run dev`: v3 review screenshots → screenshots/v3-review/
npm run capture        # all capture states (incl. the earlier S1–S6 slide set)
```

**Reset Demo:** use the presenter rail on desktop, or History → Reset Demo.

## How it fits the real app

| Path | What happens |
|---|---|
| **Primary (task-first):** Explore → Video Generator → **Create a Complete Reel with AI Agent → Create Reel** | Opens Reel Agent home |
| **Secondary (conversation-first):** AI Agent tab → **"Create a complete Reel from an idea"**, or type a Reel request in "Ask anything" | The agent replies with **Start Reel Agent**, which opens Reel Agent home |
| **Discovery:** All Tools → AI Video → **Reel Agent** tile | Reel Agent home |
| **Memory:** Settings → PREFERENCES → **Creator Memory**, Reel Agent home → Creator Memory, or New Reel → **Manage Memory** | All three open the **same** Memory Hub and store |

Every entry point leads into the same flow: Reel Agent home → (optional first-use setup) → New Reel → Agent Plan → Create → Complete Reel → Refine → Finish → History.

**Presenting:** on desktop the app frame is shown at a readable size, with a presenter rail for jumping between screens. The rail is a demo utility: it is hidden below 600px and in `?capture`. Deterministic screen states: `?capture&scenario=fresh|memory|brief-mem|plan-mem|s4|s5|s6|err`.

## Creator Memory

- **Saved Preferences** in nine categories: Visual Style, Storytelling Tone, Hook Style and Length, Scene Pacing and Transitions, Narration Voice and Language, Captions and Typography, Music Mood, Output Format, Exclusions / Things to Avoid. You can add, edit, delete, enable or disable each one.
- **AI Memory Suggestions:** pending suggestions are kept separate from saved preferences, and each one says *why* it was suggested. The choices are **Save to Creator Memory / Not Now / Dismiss**.
- **Memory Management:** what the Agent noticed, dismissed suggestions (with Reconsider), and a recent-changes log.
- **Optional first-use setup:** the creator describes their style in their own words. The app turns that into **structured suggestions**, the creator **reviews and edits** them, then taps **Save** explicitly. **Skip for Now** goes straight to New Reel.
- **Applied everywhere:** the New Reel "Using Creator Memory" card (View / Manage / Customize for This Reel / Make default); the Agent Plan's "How your Creator Memory shaped this plan" section (hook & script, visual, narration, music, captions, pacing, exclusions); and the first prepared version, which picks up the saved caption style and music mood.
- **Precedence:** explicit This-Reel-only choices override saved defaults, and never change Memory unless the creator taps **Make default**.

### Learning rule (simulated, deterministic)

1. Creative choices made for a Reel are recorded as non-sensitive *signals*. These are New Reel overrides, plan adjustments (hook length, pacing) and refinements (music, caption style), with the latest choice per preference key per Reel.
2. If the same choice appears in **2 different Reels**, differs from what's saved, and hasn't already been saved or dismissed, a **pending suggestion** is created with its reason, e.g. *"You chose 'Bright Acoustic' for music mood in 2 different Reels."*
3. It is saved to Memory **only** on Save to Creator Memory. Not Now snoozes it (it returns only with new evidence). Dismiss rejects it (it can be reconsidered under Manage). A one-off change never becomes a preference.
4. Pending suggestions show in the Memory Hub, and also after a Reel is marked Ready to Use.

The "short opening hooks" suggestion in a fresh demo is labelled **seeded demo history**. Setup extraction uses keyword rules. **There is no real AI or learning model.**

## Real vs simulated

| Real (genuinely works) | Simulated (disclosed in the UI) |
|---|---|
| Navigation across the 4 tabs, AI Video, Settings, Reel Agent, Memory, the whole Reel flow | Recreated existing YouCam tools outside the concept show an "out of scope" note |
| Memory edits, toggles, deletes, setup save; synced across all entry points; persisted in localStorage | The AI Agent chat replies with canned text and detects Reel intent with keywords |
| Signal recording, the suggestion rule, Save / Not Now / Dismiss / Reconsider | The learning rule is deterministic, as above; the "short hooks" suggestion is seeded demo history |
| Overrides with "Make default"; precedence over saved defaults | The agent plan is deterministic from the seed brief; production stages are paced animation |
| Playback: 20s, 9:16, 4 scenes, audible narration and music, timed Traditional Chinese captions | "Generation" plays prepared media; coins are DEMO / illustrative, with no payments |
| Caption, music and Scene 02 revisions; Original / Revised compare; Keep Original / Use Revision | Scene 02's alternate is a prepared clip; re-voicing rewritten text isn't simulated |
| Ready to Use, saving to History, **Export Video** downloads a real MP4 matching the scene and music choice | Plan-only settings (e.g. Cool Night on the coffee brief, warm narration, fast cuts) are labelled "plan only" |

**Export limitation:** the four prepared exports (Scene 02 original/alternate × two tracks) have burned-in **Bold White** original captions. Caption text and style edits, including a Memory caption style such as Clean Minimal, are preview-only. The Finish screen says so.

## Media provenance (`public/media/`)

Everything was created for this demo on this machine. There are no stock, scraped or third-party assets.

- **Visuals:** procedural CoreGraphics illustrations (`media-src/render.swift`). Original work.
- **Music:** synthesized from math (`media-src/music.py`). Original work.
- **Narration:** the macOS `say` voice **Meijia (zh_TW)**. This is fine for a personal, non-commercial interview demo; check Apple's terms before any commercial use.
- **Template thumbnails on Explore:** the same original illustrations, not YouCam content.

To regenerate the media: `cd media-src && python3 music.py build && swiftc -O -swift-version 5 render.swift -o build/render && ./build/render "$PWD/build" "$PWD/../public/media" all`. The narration clips `build/vo1–4.aiff` come from `say -v Meijia -r 165`.

## Design

See `YOUCAM_UI_AUDIT.md`. It is based on Gina's screenshots in `visual-references/` and also covers what's existing vs proposed. All tokens live in `src/theme.ts`. The look is YouCam-*inspired* (inferred values, not official tokens).

## Known limitations

- Only the coffee brief has playable media. Other briefs produce a plan that's saved as a draft.
- Caption edits aren't in exported MP4s. Voice and music level sliders are preview-only. Only Scene 02 has an alternate.
- The Memory Hub's "noticed choices" list can't yet be cleared on its own (Reset Demo clears everything).
- Slide screenshots: `screenshots/S1-creator-memory.png` … `S6-finish.png` (Slides 07/08) are captured in the approved v3 UI. Regenerate them with `npm run capture` (dev server running).
- Tested in Chrome only (headless + in-app browser), not Safari or a physical iPhone. There's no backup screen recording (no ffmpeg); use QuickTime.
