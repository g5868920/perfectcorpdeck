# Data & state model (v3.1)

Everything lives in the browser. **No server, account, analytics or paid API.**

| Store | What | Where |
|---|---|---|
| App state | Creator Memory, series, suggestions, signals, projects, demo coins | `localStorage["reel-agent-demo.v1"]` (schema `version: 3`; v1/v2 migrate automatically) |
| Uploaded media | The creator's photo/video **bytes** | IndexedDB `reel-agent-media/blobs`, keyed by asset id. Never uploaded; survives refresh; cleared by Reset Demo |
| Rail UI | Open groups, guided-demo step | `localStorage["reel-agent-rail"]` (presenter utility only) |

## Creator Memory

```
memory: MemoryItem[]          // Creator Identity — global long-term defaults
series: SeriesProfile[]       // Content/Series preferences — apply only to Reels in that series
  { id: 'travel-food' | 'sponsored-beauty', name, enabled, items: MemoryItem[] }
suggestions: Suggestion[]     // pending | snoozed | saved | rejected, with scope ('global' or a series id) + provenance
signals: Signal[]             // non-sensitive STYLE choices per Reel (latest per key), used only by the suggestion rule
memoryLog: { at, text }[]     // management history
```

`MemoryItem = { id: preferenceKey, category, label, value, enabled, source: seed|creator|setup|suggestion }`

**Supported preference keys** (the only things that can be applied, learned or saved): `visual, tone, hook, hook-length, pacing, voice, captions, overlay, music, format`, plus free-text `avoid-*` exclusions.

## Resolution — one source of truth (`resolveSettings` in `src/state.ts`)

For every supported key, **highest wins**:

1. **This Reel only**: `project.overrides[key]` (New Reel → Customize, or Plan → Adjust)
2. **Series**: an enabled item in the project's enabled series
3. **Creator Identity**: an enabled `memory` item
4. **App default**: `APP_DEFAULTS[key]`, always labelled "App default"

Plans, the New Reel card and the media compositor **resolve live** from current state. `project.applied` is written once, at **Approve & Generate**, as a record of what the Reel was made with (used by Preview, History and Export).

> **v3.1 fix:** plans used to read a snapshot taken at "Plan My Reel". Any Memory edit made afterwards (Hub, Settings, Manage) left the plan stale. That caused the reported mismatches: Warm vs Neutral, Clean Minimal vs Bold White, Minimal vs Standard, a <3s hook shown as 4s. Unlabelled defaults made it worse. Now every plan row shows its resolved value **and** its source. `scripts/smoke-memory.mjs` checks every key under every precedence case (63 checks).

## Guardrails

- **One-off overrides** live on the project only. They change Memory only if the creator taps **Make default**.
- **Never stored in Memory:** restaurant names and notes, brand/campaign notes (`project.campaignNotes`), product claims, customer info. `sensitiveReason()` refuses values that look like contact details, claims ("clinically", "%", 保證…), campaign/brand instructions or customer data, and the UI explains why.
- **Signals** are recorded only for supported style keys, never from brief text.

## Learning rule (simulated, deterministic — `deriveSuggestions`)

The same key and value chosen in **≥ 2 different Reels** creates a **pending** suggestion, with a reason and provenance (which Reels, and how the choice was made).

- **Scope:** a series if every one of those Reels used the same series, otherwise Creator Identity.
- **Skipped** if the target already has that value, or the creator already saved or rejected it.
- **Accept** writes it to the target scope. **Not Now** snoozes it; it returns only with new evidence. **Reject** prevents it from coming back (recoverable under Manage → Reconsider).

## Reel projects

```
ReelProject {
  mode: 'idea' | 'media', brief, series, overrides, applied (frozen at generation), stage, chosen, readyToUse, saved
  // idea mode (prepared media): pack 'coffee' | 'bookstore', script, sceneOrder, original/revision: ReelVersion
  // media mode: media: MediaAsset[], spots: {name, area, note}[5], slots: assetId[7], campaignNotes,
  //             mOriginal / mRevision: MediaVersion { slots, captions, music, captionStyle }
}
MediaAsset { id, name, kind: image|video, source: upload|sample, url? (samples), duration?, attribution }
```

**Media timeline (`mediaTimeline`)** — 7 segments: Hook, Spot 1–5, Outro.

- **Hook length** from Memory: 2.6s (short) or 4s.
- **Spot length** from pacing: 3.2s (fast), 3.6s (standard) or 4.2s (minimal).
- **Transitions:** cut (fast) / dip (standard) / cross-fade (minimal).
- **Outro:** 3s. Total is roughly 22–28s.

**Footage assignment (`autoSlots`, "simulated analysis"):** a video clip opens the Reel if there is one, then the five spots are filled in the creator's import order, and the last item closes. The creator can reassign any segment on the plan or in Refine.

**Captions (`mediaScript`):** the hook line comes from the hook style. Each spot line is "n. {name}｜{note}", using only what the creator typed. The outro is a save-for-later line.

## Output paths

| Path | Preview | Export |
|---|---|---|
| Idea (coffee) | Prepared silent video + narration stem + music stem, live caption overlay | Prepared MP4 matching the Scene 02 × music choice; burned-in Bold White captions (caption edits are preview-only — labelled) |
| Media (yakiniku) | Canvas compositor (`MediaReelPlayer`) built from the chosen footage, with Memory grade, pacing transitions, info label, captions, the music bed (Web Audio) and **browser speech** narration | Real-time `MediaRecorder` capture of the same canvas + music → MP4 (Chrome) or WebM. **Browser narration isn't captured** — labelled |
