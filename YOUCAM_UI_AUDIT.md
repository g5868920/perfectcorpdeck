# YouCam AI Pro — UI reference audit (v3.1)

Updated **2026-11-04**. The primary source is Gina's **own iPhone screenshots of the current app** in `visual-references/`. The earlier store-listing audit (App Store v1.32.1 / Google Play, Oct 2026) is kept below as secondary context.

> Note: the screenshots were first placed in `dist/visual-references/`. `dist/` is wiped by `npm run build`, so they now live at the project root in `visual-references/`.

## Sources (precedence order)

| # | File | Screen | What it establishes |
|---|---|---|---|
| 1 | `home.jpg` | **Explore** | Header, feature-icon grid, AI Templates, 4-tab nav |
| 1 | `ai-agent.png` | **AI Agent** | Conversational layout, suggested prompts, input bar |
| 1 | `all-tools.png` | **All Tools** (bottom sheet) | Category tabs, grouped tool cards |
| 1 | `video-generator.png`, `video-generator-2.png` | **AI Video** generator | Mode segment, model selector, upload, prompt, duration/resolution, Generate + coins |
| 1 | `history.png` | **History** | VIDEO/IMAGE tabs, tool filter chips, empty state |
| 1 | `settings.jpg`, `settings-2.png` | **Settings** | Account, PRO banner, My Credits, section bands incl. **PREFERENCES** |
| 2 | App Store / Google Play listings | Marketing composites | Secondary only (see v2 notes at the end) |

## Information architecture (observed)

- **Bottom navigation, 4 tabs:** Explore · AI Agent · All Tools · History. It is a full-width white bar with navy icons and labels; the active tab gets an indigo filled icon and label. *(The v2 prototype had a floating pill nav with 3 tabs. v3 replaces it with the real structure.)*
- **Explore header:** "YouCam AI Pro" wordmark (the "AI" sits in a gradient tile), a gray coin pill (gold "C" coin + number), and a settings gear.
- **Feature grid:** 2 rows × 5 round indigo icons with white line glyphs and 2-line labels. Italic **HOT** (red) and **NEW** (green) badges sit on the top-right corner of an icon. Items: Image Generator, Video Generator, Character Animator, AI Video Editor, AI Conversation, AI Influencer, Talking Photo, AI Replace, AI Remove, All Tools.
- **AI Templates:** bold section title; filter chips where the active one is a black pill with white text and inactive ones are lavender pills (Trending, Marketing, UGC Vlogger, AI Conversation…). Sub-sections with an emoji title (e.g. "Social Trend", "Be the Director of Your Movie"). Large rounded image cards with a white caption at the bottom.
- **AI Agent:**
  - Pushed full-screen chat with a back chevron, centered "AI Agent" title and a menu icon (top-right).
  - The Generative-AI terms line, a gradient robot avatar and an indigo "AI Agent" name, then a greeting and capability text.
  - A divider, then **suggested-prompt pills** (lavender, left-aligned, stacked) and a "Subscribe Now" gradient pill.
  - A bottom **"Ask anything"** bar: gray rounded field, an image-upload button with a violet outline, a send arrow.
  - No tab bar is visible on this screen.
- **All Tools:** a bottom sheet over Explore, with X close and centered "All Tools". Category tabs **AI Video / AI Image / AI Portrait** (the active one is a black pill). Each group is a light-lavender rounded card with a bold title and a 4-column grid of black line icons with labels and HOT/NEW badges. AI Video tools: Image to Video, Text to Video, AI Video Editor, AI Influencer, Character Animator, Talking Photo, AI Conversation.
- **AI Video generator:**
  - Header: back chevron, an outlined indigo **"History"** pill, the "AI Video" title, and a coin pill. Below it, a dark sign-in promo strip.
  - Mode segment **Image to Video / Text to Video**: solid indigo when active, lavender when inactive. These are generation modes.
  - **AI Model** selector: a lavender card with the model logo, a NEW badge, an orange "-25%" tag and a chevron.
  - Upload box: gray, "+ Add 1-10 Photos". A Start & End Frame toggle, and a "Check out more templates" outlined pill.
  - **Prompt (Required)** gray box with a counter (138/26000).
  - **Duration** and **Resolution** outlined option boxes; the selected one has a purple→blue gradient border.
  - A large **Generate** pill showing coin cost and a struck-through old price, an orange "25% OFF" tag, "Buy Credits Now!" and a help "?" icon.
- **History:**
  - The same header as Explore, then **VIDEO / IMAGE** top tabs (indigo underline when active).
  - Below them, **filter chips by tool** (Image to Video · AI Agent · Character Animator…). These are *category filters* for past outputs, **not** generation modes.
  - Empty state: a tilted film illustration, "No generated videos", and a purple→blue gradient **Generate** button.
- **Settings:**
  - A sheet with a back chevron and centered title; the account row (avatar, name, email).
  - A dark **PRO** promo card, then a **My Credits** card (lavender→blue gradient) with balance, "Details" (indigo), Subscription and Pay-as-you-go rows.
  - Gray uppercase **section bands**: SUBSCRIPTION, SUPPORT, **PREFERENCES** (contains "Remove watermark" with a toggle), ABOUT, ACCOUNT MANAGEMENT.
  - White rows with chevrons, and an indigo "Sign out" pill.

## Visual language (observed → tokens in `src/theme.ts`)

| Element | Observation | Token(s) |
|---|---|---|
| Canvas | Pure white on all main screens; panels light gray (#F2F2F6-ish) | `canvas #FFFFFF`, `surfaceAlt` |
| Primary | Saturated indigo (active segment, Details, Sign out, agent name) | `primary #3E3BD6` |
| Soft fill | Lavender chips, model selector, inactive segment | `primarySoft #ECEDFC` |
| Active filter | Near-black pill | `chipDark #1C1C28` |
| Nav text | Dark navy | `navy #20206A` |
| Gradients | Generate: purple→blue · Subscribe: blue→indigo · selected option border: purple→blue · icon tiles: indigo | `gradient.generate / subscribe / ring / icon` |
| Badges | HOT red, NEW green, discount orange | `hot`, `new`, `discount` |
| Coins | Gray pill with a gold "C" coin | `coinPill`, `coin` |
| Groups / bands | Light-lavender tool cards; gray settings bands | `group`, `band` |
| Type | iOS system font (SF Pro). Titles ~19px regular/medium; section titles bold ~20px; body 15–17px | `font.family` |
| Shape | Pills everywhere; cards 16–20px radius; round 58px feature icons | `radius` |

All values are **sampled estimates**, not official Perfect Corp design tokens.

## Existing UI vs proposed extension

| Recreated EXISTING surface | PROPOSED additions (tagged "Proposed" / "Concept" in the UI) |
|---|---|
| Explore (grid, templates, header, 4-tab nav) | — (the entry is via Video Generator, keeping Explore faithful) |
| AI Video generator | **"Create a Complete Reel with AI Agent"** card + **Create Reel** CTA (primary, task-first entry) |
| AI Agent chat | Suggested prompt **"Create a complete Reel from an idea"**; Reel-intent detection in the chat input (secondary, conversation-first entry) |
| All Tools → AI Video group | **Reel Agent** tool tile (discovery) |
| Settings → PREFERENCES | **Creator Memory** row → the same Memory Hub |
| History (VIDEO tab, tool filters) | **Reel Agent** filter showing Reels and draft plans |
| — | Reel Agent home, first-use setup, Creator Memory Hub, New Reel → Plan → Create → Refine → Finish |

Existing tools outside the concept (Image Generator, AI Replace, templates, model picker, single-clip Generate, subscriptions, etc.) are shown for context only. They respond with a toast saying they're not part of this demo, so there are no dead buttons, and the single-clip Generate is visibly disabled with an explanation.


## v3.1 additions (proposed, built on the same design language)

| Proposed screen / element | Built from existing patterns |
|---|---|
| **Choose Creation Mode** (Use My Photos & Videos · Start from an Idea) | Rounded selection cards. The primary card uses the gradient border from AI Video's selected Duration/Resolution option |
| **Import Media** | AI Video's gray upload box and outlined pills; thumbnails in a 9:16 grid with "Sample" (violet) or "Yours" (green) source badges and ▶ duration for clips |
| **5 restaurants** | Gray rounded inputs like the AI Video prompt field |
| **Content series chips** | Pill chips (lavender / indigo-outlined when selected) |
| **Media storyboard** | Same scene cards as the idea path, but thumbnails are the actual imported media, with a footage picker |
| **Plan source chips** | "This Reel only" (pink) · "Series: …" (green) · "Creator Identity" (indigo) · "App default" (gray) |
| **Memory Hub tabs** | Identity · Series · Pending · Manage, using the existing indigo segmented control |
| **Presenter rail** (desktop only) | Not part of the app. Four collapsible groups (01 Existing, 02 Reel Agent, 03 Creator Memory, 04 Demo/QA) with Existing/Proposed/QA tags and a Guided Demo; hidden on phones and in capture mode |

## Deliberate differences / not reproduced

- **No YouCam logo files or screenshot backgrounds.** The wordmark is styled text, and the template thumbnails are this demo's own illustrations.
- **No personal data.** The account is "Demo Creator / demo.creator@example.com". Coins are a synthetic demo balance (120), and PRO/subscription and purchase UI is omitted.
- **Not reproduced:** the dark sign-in strip on AI Video and the PRO promo card in Settings (they suggest account and payment flows that are out of scope).
- **A small "Concept demo" pill** is in the Explore and History header.
- **The desktop presenter rail** is a demo utility only. It is hidden on phones (<600px) and in `?capture`.

## v2 notes (store listings, secondary)

The App Store and Google Play marketing composites showed dark media screens with light panels. The v3 screenshots confirm that the **everyday app surfaces are white/light**, so the approved "fully light, dark only behind video" direction is consistent with the real app.
