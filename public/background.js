let timerInterval;

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusTimer') {
    chrome.storage.local.get(['minutes', 'seconds', 'isActive', 'focusSessions'], (res) => {
      let { minutes, seconds, isActive, focusSessions } = res;
      

      if (seconds === 0) {
        if (minutes === 0) {
          // Timer done
          chrome.alarms.clear('focusTimer');
          chrome.storage.local.set({ 
            isActive: false, 
            focusSessions: (focusSessions || 0) + 1 
          });
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'Focus session complete!',
            message: 'Your garden has grown! 🌿',
            priority: 2
          });
        } else {
          minutes--;
          seconds = 59;
        }
      } else {
        seconds--;
      }
      
      chrome.storage.local.set({ minutes, seconds });
    });
  }
});
