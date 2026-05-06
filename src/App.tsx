import { useState, useEffect } from "react";
import { Play, RotateCcw, Leaf, Pause, Settings, Check } from "lucide-react";

function App() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);

  const chrome = (window as any).chrome;

  useEffect(() => {
    chrome.action.setBadgeText({ text: "" });
  }, []);

  const notifyAndBadgeFallback = () => {
    chrome.action.setBadgeText({ text: "\u2713" });
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
    chrome.notifications.create("focus-" + Date.now(), {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon48.png"),
      title: "Focus session complete!",
      message: "Your garden has grown! \uD83C\uDF3F",
      priority: 2
    });
  };

  useEffect(() => {
    // Load initial state from storage
    chrome.storage.local.get(["endTime", "isActive", "focusSessions", "customMinutes"], (res: any) => {
      if (res.focusSessions) setSessions(res.focusSessions);
      if (res.customMinutes) setCustomMinutes(res.customMinutes);
      
      if (res.isActive && res.endTime) {
        setIsActive(true);
        const remaining = Math.round((res.endTime - Date.now()) / 1000);
        if (remaining <= 0) {
          handleTimerComplete();
        } else {
          setTimeLeft(remaining);
        }
      } else {
        setTimeLeft((res.customMinutes || 25) * 60);
      }
    });
  }, []);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    chrome.storage.local.get(["focusSessions"], (res: any) => {
      const newSessions = (res.focusSessions || 0) + 1;
      setSessions(newSessions);
      chrome.storage.local.set({ 
        focusSessions: newSessions, 
        isActive: false, 
        endTime: null 
      });
    });
    chrome.runtime.sendMessage({ type: "timerComplete" }, () => {
      if (chrome.runtime.lastError) {
        notifyAndBadgeFallback();
      }
    });
  };

  const toggleTimer = () => {
    if (!isActive) {
      const endTime = Date.now() + timeLeft * 1000;
      chrome.storage.local.set({ isActive: true, endTime });
      chrome.runtime.sendMessage({ type: "startTimer", endTime }, () => {
        if (chrome.runtime.lastError) {
          chrome.action.setBadgeText({ text: "" });
        }
      });
      setIsActive(true);
    } else {
      chrome.storage.local.set({ isActive: false, endTime: null });
      chrome.runtime.sendMessage({ type: "stopTimer" }, () => {
        if (chrome.runtime.lastError) {
          // No background receiver available; local state is already updated.
        }
      });
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    chrome.storage.local.set({ isActive: false, endTime: null });
    chrome.runtime.sendMessage({ type: "stopTimer" }, () => {
      if (chrome.runtime.lastError) {
        // No background receiver available; local state is already updated.
      }
    });
    setIsActive(false);
    setTimeLeft(customMinutes * 60);
  };

  const saveSettings = () => {
    chrome.storage.local.set({ customMinutes, isActive: false, endTime: null });
    chrome.runtime.sendMessage({ type: "stopTimer" }, () => {
      if (chrome.runtime.lastError) {
        // No background receiver available; local state is already updated.
      }
    });
    setTimeLeft(customMinutes * 60);
    setIsSettingsOpen(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="w-[350px] min-h-[500px] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      <div className="flex items-center justify-between p-6 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Leaf className="text-green-400" size={20} />
          <span className="font-bold text-sm tracking-widest">FOCUS GARDEN</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="https://github.com/Iccrtlity/Focus-Garden" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .322.216.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-slate-400 hover:text-white"><Settings size={20} /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {isSettingsOpen ? (
          <div className="w-full space-y-4">
            <h2 className="text-center text-xs text-slate-500 uppercase tracking-widest">Minutes</h2>
            <input type="number" value={customMinutes} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setCustomMinutes(v); }} className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-green-400 text-3xl font-mono text-center focus:outline-none focus:border-green-500" />
            <button onClick={saveSettings} className="w-full bg-green-500 text-slate-950 font-bold p-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"><Check size={20} /> Save Settings</button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="text-7xl font-mono font-light mb-10 tracking-tighter">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            
            <div className="flex items-center gap-8 mb-12">
              <button onClick={resetTimer} className="p-4 bg-slate-900 rounded-full text-slate-400 hover:text-white transition-colors"><RotateCcw size={24} /></button>
              <button onClick={toggleTimer} className="w-24 h-24 bg-green-500 text-slate-950 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-90 transition-transform">
                {isActive ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" className="ml-1" />}
              </button>
              <div className="w-12"></div>
            </div>

            <div className="w-full bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 text-center">
              <div className="text-6xl mb-2 drop-shadow-md">{sessions === 0 ? "🏜️" : sessions < 3 ? "🌱" : "🌳"}</div>
              <p className="text-white font-medium">{sessions} Sessions today</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
