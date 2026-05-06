# Privacy Policy — Focus Garden

**Last updated: May 2026**

## Summary

Focus Garden does not collect, transmit, or share any personal data. All data remains exclusively on your device.

## Data Storage

Focus Garden uses `chrome.storage.local` to persist the following data locally on your device:

| Key | Purpose |
|-----|---------|
| `isActive`, `endTime` | Track whether the timer is running and when it will expire |
| `focusSessions` | Today's completed session count |
| `customMinutes`, `breakMinutes` | Your configured timer durations |
| `breakModeEnabled` | Whether automatic break transitions are enabled |
| `timerMode` | Whether the current timer is a focus or break session |
| `timeLeftSeconds` | Remaining time when a timer is paused |
| `sessionHistory` | Up to 30 days of daily session counts for the history chart |
| `lastSessionDate` | Date of last session, used for daily reset |
| `onboardingDone` | Whether the welcome screen has been shown |

## What We Do Not Do

- We do **not** collect any personal information
- We do **not** transmit any data to remote servers
- We do **not** use analytics or tracking
- We do **not** access browsing history, tabs, or any other browser data

## Permissions

| Permission | Reason |
|------------|--------|
| `storage` | Save timer state and session history locally on your device |
| `alarms` | Keep the timer accurate when the popup is closed |
| `notifications` | Notify you when a focus or break session ends |

## Contact

If you have any questions, open an issue at [github.com/Iccrtlity/Focus-Garden](https://github.com/Iccrtlity/Focus-Garden).
