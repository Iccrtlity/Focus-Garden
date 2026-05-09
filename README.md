# 🌿 Focus Garden — Chrome Extension

Focus Garden is a minimalist productivity extension for Chrome that combines the Pomodoro technique with a virtual garden. Stay focused, take structured breaks, and watch your garden grow.

## ✨ Features

- **Focus Timer** — Countdown timer using the Pomodoro technique
- **Break Mode** — Automatically starts a configurable break after each focus session
- **Persistent Timer** — Timer keeps running accurately even when the popup is closed
- **Extension Badge** — Green ✓ when focus is done, blue ✓ when break is done; clears when you open the popup
- **Desktop Notifications** — Sends a browser notification when a focus session completes
- **Virtual Garden** — Visual progress indicator that grows from seedling to sprout to tree as total sessions increase
- **Plant Customization** — Name your plant and choose a plant style from the settings panel
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

## 🚀 Installation

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/focus-garden/hclkbohhcdajaninpcmpcmgekpbafami), or load the extension locally:

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the `dist` folder

## 🔧 Development

```bash
npm run dev   # start Vite dev server
npm run build # production build to dist/
```

---

Built with ❤️ by [Iccrtlity](https://github.com/Iccrtlity)
