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
- `npm run package` — create distributable zip in `release/`

## Install

### From Release (Recommended)

1. Download the latest `nellis-auction-helper-vX.X.X.zip` from [Releases](https://github.com/bshih/NellisExtension/releases)
2. Extract the zip to a folder
3. Open `chrome://extensions`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked" and select the extracted folder

### From Source

1. Clone and build:
   ```bash
   git clone https://github.com/bshih/NellisExtension.git
   cd NellisExtension
   npm install
   npm run build
   ```
2. Open `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the project root folder

## Usage

1. Navigate to [nellisauction.com](https://www.nellisauction.com)
2. Click the extension icon
3. Configure filters and location
4. Filters apply automatically; location redirects on page load
