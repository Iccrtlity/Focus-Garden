const TIMER_ALARM = "focusTimer";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function showDoneBadge() {
  chrome.action.setBadgeText({ text: "\u2713" });
  chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
}

function showBreakDoneBadge() {
  chrome.action.setBadgeText({ text: "\u2713" });
  chrome.action.setBadgeBackgroundColor({ color: "#0ea5e9" });
}

function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

function showDoneNotification() {
  chrome.notifications.create("focus-" + Date.now(), {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon48.png"),
    title: "Focus session complete!",
    message: "Your garden has grown! \uD83C\uDF3F",
    priority: 2
  });
}

function scheduleAlarm(endTime) {
  chrome.alarms.clear(TIMER_ALARM, () => {
    chrome.alarms.create(TIMER_ALARM, { when: endTime });
  });
}

function recoverAlarmFromStorage() {
  const today = getToday();
  chrome.storage.local.get(["lastSessionDate", "focusSessions", "sessionHistory", "isActive", "endTime"], (res) => {
    // Daily reset on startup
    const lastDate = res.lastSessionDate || today;
    if (lastDate !== today && (res.focusSessions || 0) > 0) {
      const history = [...(res.sessionHistory || []), { date: lastDate, count: res.focusSessions }].slice(-30);
      chrome.storage.local.set({ focusSessions: 0, lastSessionDate: today, sessionHistory: history });
    } else if (!res.lastSessionDate) {
      chrome.storage.local.set({ lastSessionDate: today });
    }

    if (!res.isActive || !res.endTime) return;
    if (res.endTime <= Date.now()) {
      completeSessionIfActive();
      return;
    }
    scheduleAlarm(res.endTime);
  });
}

function completeSessionIfActive() {
  chrome.storage.local.get(
    ["isActive", "focusSessions", "timerMode", "breakModeEnabled", "breakMinutes", "customMinutes", "lastSessionDate", "sessionHistory"],
    (res) => {
      if (!res.isActive) return;

      const timerMode = res.timerMode || "focus";

      if (timerMode === "focus") {
        // Daily reset check
        const today = getToday();
        const lastDate = res.lastSessionDate || today;
        let currentSessions = res.focusSessions || 0;
        let history = res.sessionHistory || [];

        if (lastDate !== today && currentSessions > 0) {
          history = [...history, { date: lastDate, count: currentSessions }].slice(-30);
          currentSessions = 0;
        }

        const newSessions = currentSessions + 1;
        const breakModeEnabled = res.breakModeEnabled ?? true;

        if (breakModeEnabled) {
          const breakMinutes = res.breakMinutes || 5;
          const endTime = Date.now() + breakMinutes * 60 * 1000;

          chrome.storage.local.set({
            isActive: true,
            endTime,
            timerMode: "break",
            focusSessions: newSessions,
            timeLeftSeconds: breakMinutes * 60,
            lastSessionDate: today,
            sessionHistory: history
          });

          scheduleAlarm(endTime);
        } else {
          chrome.storage.local.set({
            isActive: false,
            endTime: null,
            timerMode: "focus",
            focusSessions: newSessions,
            timeLeftSeconds: (res.customMinutes || 25) * 60,
            lastSessionDate: today,
            sessionHistory: history
          });
        }

        showDoneBadge();
        showDoneNotification();
        return;
      }

      chrome.storage.local.set({
        isActive: false,
        endTime: null,
        timerMode: "focus",
        timeLeftSeconds: (res.customMinutes || 25) * 60
      });
      showBreakDoneBadge();
    }
  );
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "startTimer") {
    clearBadge();
    if (message.endTime) {
      scheduleAlarm(message.endTime);
    }
    return;
  }

  if (message.type === "stopTimer") {
    chrome.alarms.clear(TIMER_ALARM);
    return;
  }

  if (message.type === "timerComplete") {
    chrome.alarms.clear(TIMER_ALARM);
    completeSessionIfActive();
    return;
  }

  if (message.type === "clearBadge") {
    clearBadge();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TIMER_ALARM) {
    completeSessionIfActive();
  }
});

chrome.runtime.onStartup.addListener(() => {
  recoverAlarmFromStorage();
});

chrome.runtime.onInstalled.addListener(() => {
  recoverAlarmFromStorage();
});
