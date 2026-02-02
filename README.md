# Nellis Auction Helper

Chrome extension that enhances the Nellis Auction browsing experience with item filters and Amazon price comparison links.

## Features

**Condition Filters** — Hide items by condition:
- Used
- Minor Damage
- Unknown if Missing Parts
- Missing Parts

**Location Filter** — Auto-redirect to your preferred pickup location:
- North Las Vegas
- Dean Martin
- Henderson
- Decatur

Location preference persists across sessions and applies automatically when navigating to new pages.

**Amazon Links** — Adds "Search on Amazon" links to each item for quick price comparison.

## Build

```bash
npm install
npm run build
```

Output goes to `dist/`.

Other commands:
- `npm run dev` — watch mode
- `npm run typecheck` — TypeScript check
- `npm test` — run tests

## Install

1. Build the extension (see above)
2. Open `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the **project root folder** (not `dist/`) — the folder containing `manifest.json`

## Usage

1. Navigate to [nellisauction.com](https://www.nellisauction.com)
2. Click the extension icon
3. Configure filters and location
4. Filters apply automatically; location redirects on page load
