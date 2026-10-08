# Market analysis: free "bring your own text" speed readers

Researched October 2026. Question: is there already a free tool that lets someone take any text they have, load it into a speed reading service, and read it one word at a time (RSVP, rapid serial visual presentation) while building up their speed?

## Short answer

Yes, the core feature is a commodity. There are a dozen or more free web apps and Chrome extensions that take pasted text or a PDF/EPUB and flash it word by word. None of them is a dominant, well-known free product, and none combines the three things below:

1. Free with no daily caps.
2. An account with a synced library and reading position across the web and a browser extension.
3. Structured speed training (warm-up ramps, a target speed that adapts to comprehension, progress over time).

The big brand names (Spritz, Spreeder, SwiftRead) are freemium and put limits or key features behind a paywall. The truly free tools are mostly small, local-only projects with no sync.

So nothing major stands out, and there is room for a free product. The gap is narrow, though, and easy to copy, so the bet is on execution and polish rather than a defensible feature.

## Landscape

### Freemium brands

| Product | Form | Free tier | Notes |
| --- | --- | --- | --- |
| [Spritz](https://alternativeto.net/software/spritz) | Extension, licensed tech | Spritz Reader extension allows [3 free reads per day](https://chromeboard.com/extension/spritz-reader-speed-read-klbegddlnhkibegigmgibjhcncbbcjaj), unlimited on Pro | Popularized ORP-aligned RSVP. |
| [SwiftRead](https://apps.apple.com/app/id6470811151) (formerly Spreed) | Extension, iOS | ["Free to use within limits"](https://apps.apple.com/app/id6470811151); free version covers [web pages and pasted text](https://swiftread.helpscoutdocs.com/collection/1-legacy-browser-extension) | Largest RSVP extension. PRO removes limits; [no free trial](https://swiftread.helpscoutdocs.com/article/36-do-you-offer-a-free-trial-for-pro). Exact limits not published. |
| [Spreeder](https://alternativeto.net/software/spreeder/about) | Web, apps | Some free use; paid VIP/subscription | Third-party listings show [$9/month or $67 lifetime](https://us.fitgap.com/products/035987/spreeder). Pricing sources conflict. |

### Free web apps (paste or upload, read in the browser)

| Product | Inputs | Accounts / sync | Training |
| --- | --- | --- | --- |
| [Speeedy](https://github.com/sami-29/speeedy) (MIT, open source) | PDF, EPUB, DOCX, TXT, MD, RTF, HTML, ODT, paste | None. Local IndexedDB, manual export | Speed ramp, benchmark quiz, WPM trend, streaks. The closest match feature-wise. ~60 GitHub stars. |
| [WarpRead](https://warpread.app/tools/rsvp-reader) | PDF, EPUB, DOCX, TXT, paste | None | Basic |
| [SpeedRead](https://speedread.life/) | PDF, DOCX, EPUB, paste | None | Basic |
| [ReadKinetic](https://www.readkinetic.com/app) | PDF, EPUB, paste | None, offline PWA | Basic |
| [YouReadFast](https://www.youreadfast.com/) | PDF, EPUB, TXT, MD, web pages | None | Basic |
| [ReadAnythingFast](https://readanythingfast.com/) | PDF, DOCX, TXT, paste | None | Basic, up to 1000 WPM |
| [Strobe](https://strobefast.app/) | PDF, EPUB, TXT, MD, paste | On-device only | Apple native apps, not web |

### Free Chrome extensions

[Sprint Reader](https://chrome.google.com/webstore/detail/kejhpkmainjkpiablnfdppneidnkhdif), several apps simply named ["Speed Reader"](https://chromeboard.com/extension/speed-reader-ecicibkbkjbihhoeeddnidmhinafkice), [Read For Speed](https://www.chromeboard.com/extension/read-for-speed-rsvp-reade-iajjennlcnindjipmaocoacahkbcmlac), [Read4Speed](https://www.chromeboard.com/extension/read4speed-speed-reader-plcmfbgljakhjikmalfidhjapocaakec), [FlashRead](https://www.chromeboard.com/extension/flashread-rsvp-speed-read-ceciamidjbidonlidfekkiecpnhopfck) and others. Typical pattern: right-click selected text or a whole page, read in an overlay. Most are local-only, with small user counts (dozens to low thousands), and few handle file uploads or keep a library.

## Where a new product could win

- **Web + extension with one synced library.** Nobody free does this. Start a book on the laptop's web app, continue from the extension side panel on another machine.
- **Training, not just playback.** Per-session warm-up ramp, a target speed that only moves up when the reader reports good comprehension, and a simple progress view. Speeedy has pieces of this but is local-only.
- **Free without caps.** Supabase and Vercel free tiers cover an early user base at close to zero cost (see the architecture doc for limits).
- **Privacy story.** Files are parsed in the browser; only extracted text is stored, and only when signed in.

## Risks to take seriously

- **Low switching costs and easy copying.** The feature set is well understood. Open-source projects like Speeedy could add sync.
- **The science is mixed.** A widely cited review (Rayner et al., 2016, *Psychological Science in the Public Interest*, "So Much to Read, So Little Time") found that speed gains from techniques like RSVP generally come with lower comprehension, partly because readers cannot glance back. The product should frame itself as a focus and skimming tool with honest comprehension feedback, not promise 3x reading with full retention. The comprehension rating and the "previous sentence" control in this design exist for that reason.
- **Retention.** Speed reading apps tend to see a burst of interest then drop-off. The library and extension are the hooks that make it part of daily reading.
- **Free hosting limits.** Vercel's Hobby plan is for non-commercial use only. Any monetization means moving to Vercel Pro.

## Recommendation

Proceed with the build, positioned as "free speed reader with a synced library across web and Chrome, plus honest speed training." Ship the web app and the extension together, since the sync between them is the main differentiator. See [architecture.md](./architecture.md).
