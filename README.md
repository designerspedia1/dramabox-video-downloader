# DramaBox Video Downloader

Paste a DramaBox link, get numbered download links for every episode.

- Works with share links (`sharet.dramabox.com/play?bid=…&cid=…`) and video page links (`dramabox.com/video/…`)
- Numbered episode list with durations, one-tap download buttons, "Copy all links"
- Only episodes DramaBox publishes as **unlocked/free** expose download links — locked episodes are labelled and cannot be downloaded by any tool
- Signed links expire, so fetch fresh links when you want to download
- Includes a **bookmarklet** for logged-in sessions: save it in your browser, open a DramaBox episode page while signed in (e.g. with a subscription), tap it, and it extracts numbered links for every episode unlocked on your account — no password ever leaves your browser

## Deploy

Hosted as a static frontend + one serverless function (`/api/episodes`) on Vercel. No build step, no dependencies.
