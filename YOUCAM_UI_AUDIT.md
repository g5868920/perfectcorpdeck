# YouCam AI Pro — UI reference audit

Audit date: **2026-11-04**. Purpose: ground the Creator-Aware Reel Agent concept demo in the *current* YouCam AI Pro look so it feels native, without copying screens or claiming official design tokens.

## Sources reviewed (in precedence order)

| # | Source | What it showed | Date / version |
|---|---|---|---|
| 1 | Gina's own recent app screenshots | **None in the project folder** — not reviewed. If you have recent screenshots, please add them; they would override everything below. | — |
| 2 | App Store listing `id6451239387` — 6 marketing screenshots (AI Photo Generator, AI Dance Video, AI Video Generator, Viral AI Trend, AI Agent, AI Multimodel) | Device frames with real in-app UI fragments | **Version 1.32.1, released ~6 days before audit (≈ 2026-10-29)** |
| 2 | Google Play listing `com.youcam.ai.beauty.art.maker.generator` | Same screenshot set as App Store | Updated **2026-10-21** |
| 3 | perfectcorp.com/zh-tw/consumer/apps/yca | Marketing site; zh-TW product name **玩美 AI 繪圖** | Current site |
| 3 | yce.perfectcorp.com/zh-tw/ai-agent | YouCam *Online Editor* AI Agent (web product, different app) — secondary only | Current site |
| 4 | perfectcorp.com news "YouCam AI Pro multi-model" | Text only (feature context: multi-model image & video) | 2025-10-30 — **older, not used for visuals** |

Store screenshots are marketing composites. The in-app pieces inside the device frames are the most reliable visual evidence available, but they are partial and cropped.

## Grounded observations

| Area | What was observed | Confidence |
|---|---|---|
| **Canvas** | **Mixed, not purely light.** Media-heavy screens (AI Video feed, AI Agent chat) sit on a **black/near-black canvas** with white text. Input/selection panels sit on **light (white / very light grey) rounded sheets** over the media: the prompt panel, the "Sample Videos" tray and the floating bottom nav. | High (seen in 4 of 6 screenshots) |
| **Color family** | Indigo/blue primary (chat bubble ≈ saturated indigo-blue); **blue → violet → magenta gradients** on selected thumbnails, model rings and the app icon; deep purple marketing backdrop. | High for hue family, **low for exact hex** (sampled from compressed JPEGs) |
| **Coins** | Top-right **coin pill**: gold coin glyph + number in a rounded pill (e.g. "1000", "0"). It appears on the AI Video and AI Agent headers. | High |
| **Header** | Back chevron on the left, centered short title ("AI Video", "AI Agent"), coin pill on the right; sometimes a small outlined "History" pill. | High |
| **Bottom navigation** | Floating white rounded bar with four tabs: **Create · Business · AI Tools · History**. The active tab has a pale lavender pill behind an indigo icon and label. | High (one clear screenshot) |
| **Prompt form** | Light rounded field with a **violet outline when focused**, leading lightbulb icon, character counter ("23/600"). | High |
| **Model selector** | Row of **circular model chips** (logo + small two-line label). The selected one is larger with a pink-violet glow ring. | High |
| **Cards / thumbnails** | Rounded image cards (≈10–16 px radius). Template cards use a **gradient label strip** at the bottom (indigo→violet). The selected thumbnail has a **2 px gradient border**. | Medium–High |
| **Video/player** | Full-bleed media with a **frame-strip timeline** and a small blue playhead marker; a large centered play glyph on video cards. | Medium |
| **Agent pattern** | Chat-style AI Agent: user bubble (indigo), suggestion cards, light message bar with image and mic icons. | High |
| **Typography** | In-app UI looks like the iOS system sans (SF Pro): bold short titles, compact 11–13 px labels. Marketing headlines use a rounded geometric sans — **not** used in-app. | Medium |
| **Spacing / shape** | Generous rounding everywhere (pills, 12–20 px cards), compact paddings, dense thumbnail rows. | Medium |

## Uncertain / not verified

- Exact color values, font family and weights, spacing scale: **inferred, not official tokens.**
- Whether a light-mode variant exists for the AI Video and AI Agent screens: **not observed.**
- Home screen layout, coin purchase flow, settings: **not visible** in the screenshots.
- The Business and AI Tools tabs are out of this feature's scope and are **not reproduced.**

## Design decision for this prototype

**Chosen direction (Gina, 2026-11-04): fully light app canvas, consistent with YouCam AI Pro's light panels, prompt sheet and bottom navigation. Dark surfaces are used only behind video playback.**

- **Light everywhere in the app UI:** near-white canvas (`#F5F5FA`), white cards, light-grey inputs and chips. The S3 Hook card, previously dark, is now a white card with a gradient accent bar. Toasts are white.
- **Dark only for video:** the player stage in S4/S5 uses `--c-stage` (`#0B0B12`), matching YouCam's full-bleed media screens.
- **Kept from the audit:** indigo primary; blue→violet→magenta gradient for primary CTAs, selection and the agent mark; a gold coin pill labelled DEMO; a back chevron, centered title and coin pill in the header; a floating white bottom nav with a lavender active pill; a violet-outlined prompt field with a character counter; rounded thumbnail cards with gradient tag strips; pill chips; the iOS system font stack (SF Pro / PingFang TC).
- **Not reproduced:** the Business and AI Tools tabs (out of scope, so there are no fake nav items), YouCam logos and real screenshots. A visible **"Concept Demo"** label is kept. The result is **YouCam-inspired, not identical.**

All inferred tokens are centralized in **`src/theme.ts`**.
