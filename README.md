# 🌿 Focus Garden — Chrome Extension

Focus Garden is a minimalist productivity extension for Chrome that combines the Pomodoro technique with a virtual garden. Stay focused, take structured breaks, and watch your garden grow.

> **[Install from the Chrome Web Store](#)** · [View Source](https://github.com/Iccrtlity/Focus-Garden) · [Privacy Policy](./PRIVACY.md)

## ✨ Features

- **Focus Timer** — Countdown timer with circular progress ring using the Pomodoro technique
- **Break Mode** — Automatically starts a configurable break after each focus session
- **Persistent Timer** — Timer keeps running accurately even when the popup is closed
- **Extension Badge** — Green ✓ when focus is done, blue ✓ when break is done; clears when you open the popup
- **Virtual Garden** — Visual progress indicator that grows with your sessions (🏜️ → 🌱 → 🌳)
- **Session History** — Bar chart of the last 7 days with Today / This Week / All Time totals
- **Daily Reset** — Session counter automatically resets at midnight; past days are saved to history
- **Onboarding** — Short welcome screen on first install explaining core features
- **Customizable Durations** — Set your own focus and break lengths via the settings panel
- **Break Mode Toggle** — Disable automatic breaks if you want to chain focus sessions

## 🛠 Tech Stack

- **Framework:** React + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Extension:** Chrome Manifest V3 with background service worker

## 🚀 Install from Source

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/Iccrtlity/Focus-Garden.git
   cd Focus-Garden
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the `dist` folder

## 📦 Build a Store-ready ZIP

```bash
npm run package   # builds dist/ and outputs focus-garden.zip
```

Upload `focus-garden.zip` directly to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).

## 🔧 Development

```bash
npm run dev   # start Vite dev server
npm run build # production build to dist/
```

---

Built with ❤️ by [Iccrtlity](https://github.com/Iccrtlity)

