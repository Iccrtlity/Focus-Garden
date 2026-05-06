const TIMER_ALARM = "focusTimer";

function showDoneBadge() {
  chrome.action.setBadgeText({ text: "\u2713" });
  chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
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

function completeSessionIfActive() {
  chrome.storage.local.get(["isActive", "focusSessions"], (res) => {
    if (!res.isActive) return;

    const newSessions = (res.focusSessions || 0) + 1;
    chrome.storage.local.set({
      isActive: false,
      endTime: null,
      focusSessions: newSessions
    });

    showDoneBadge();
    showDoneNotification();
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "startTimer") {
    clearBadge();
    if (message.endTime) {
      chrome.alarms.clear(TIMER_ALARM, () => {
        chrome.alarms.create(TIMER_ALARM, { when: message.endTime });
      });
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
