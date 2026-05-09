# Privacy Policy — Focus Garden

**Last updated: May 2026**

## Summary

Focus Garden does not collect, sell, transmit, or share personal data. Timer state, settings, history, plant customization, and achievement progress remain on your device in local browser storage.

## Data Storage

Focus Garden uses `chrome.storage.local` to persist the following data locally on your device:

| Key | Purpose |
|-----|---------|
| `isActive`, `endTime` | Track whether the timer is running and when it will expire |
| `focusSessions` | Today's completed session count |
| `totalFocusSessions` | Total completed focus sessions, used for garden growth and milestones |
| `customMinutes`, `breakMinutes` | Your configured timer durations |
| `breakModeEnabled` | Whether automatic break transitions are enabled |
| `timerMode` | Whether the current timer is a focus or break session |
| `timeLeftSeconds` | Remaining time when a timer is paused |
| `sessionHistory` | Up to 30 days of daily session counts for the history chart |
| `lastSessionDate` | Date of last session, used for daily reset |
| `onboardingDone` | Whether the welcome screen has been shown |
| `plantName`, `plantSpecies` | Your local plant customization settings |

Milestones and achievements are calculated locally from `focusSessions`, `totalFocusSessions`, and `sessionHistory`. They do not create a user account, leaderboard, profile, or remote record.

## What We Do Not Do

- We do **not** collect any personal information
- We do **not** transmit timer data, settings, plant customization, history, or achievements to remote servers
- We do **not** use analytics or tracking
- We do **not** access browsing history, tabs, or any other browser data

Focus Garden sets a standard uninstall URL (`https://focus-garden.spacekeep.dev/uninstall`) so the browser may open that page if you uninstall the extension. The extension does not attach your local timer data or settings to that URL.

## Permissions

| Permission | Reason |
|------------|--------|
| `storage` | Save timer state, settings, plant customization, session history, and local milestone progress on your device |
| `alarms` | Keep the timer accurate when the popup is closed |
| `notifications` | Notify you when a focus session ends |

## Contact

If you have any questions, open an issue at [github.com/SpaceKeep/Focus-Garden](https://github.com/SpaceKeep/Focus-Garden).
