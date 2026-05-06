import { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Leaf, Pause, Settings, Check, BarChart2 } from "lucide-react";

type TimerMode = "focus" | "break";
type View = "timer" | "settings" | "history" | "onboarding";

interface HistoryEntry {
  date: string;
  count: number;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [view, setView] = useState<View>("timer");
  const [customMinutes, setCustomMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [breakModeEnabled, setBreakModeEnabled] = useState(true);
  const [timerMode, setTimerMode] = useState<TimerMode>("focus");
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([]);

  const timeLeftRef = useRef(timeLeft);
  const isActiveRef = useRef(isActive);
  const completingRef = useRef(false);
  timeLeftRef.current = timeLeft;
  isActiveRef.current = isActive;

  const chrome = (window as any).chrome;

  useEffect(() => {
    chrome.action.setBadgeText({ text: "" });
  }, []);

  useEffect(() => {
    chrome.storage.local.get(
      ["endTime", "isActive", "focusSessions", "customMinutes", "breakMinutes",
        "breakModeEnabled", "timerMode", "timeLeftSeconds", "sessionHistory",
        "lastSessionDate", "onboardingDone"],
      (res: any) => {
        // Daily reset
        const today = getToday();
        const lastDate = res.lastSessionDate || today;
        let currentSessions = res.focusSessions || 0;
        let history: HistoryEntry[] = res.sessionHistory || [];

        if (lastDate !== today && currentSessions > 0) {
          history = [...history, { date: lastDate, count: currentSessions }].slice(-30);
          currentSessions = 0;
          chrome.storage.local.set({ focusSessions: 0, lastSessionDate: today, sessionHistory: history });
        } else if (!res.lastSessionDate) {
          chrome.storage.local.set({ lastSessionDate: today });
        }

        setSessions(currentSessions);
        setSessionHistory(history);

        const nextFocus = res.customMinutes || 25;
        const nextBreak = res.breakMinutes || 5;
        const nextMode: TimerMode = res.timerMode || "focus";

        setCustomMinutes(nextFocus);
        setBreakMinutes(nextBreak);
        setBreakModeEnabled(res.breakModeEnabled ?? true);
        setTimerMode(nextMode);

        if (!res.onboardingDone) {
          setView("onboarding");
        }

        if (res.isActive && res.endTime) {
          const remaining = Math.max(0, Math.round((res.endTime - Date.now()) / 1000));
          if (remaining > 0) {
            const full = (nextMode === "focus" ? nextFocus : nextBreak) * 60;
            setTotalSeconds(full);
            setTimeLeft(remaining);
            setIsActive(true);
          } else {
            const full = (nextMode === "focus" ? nextFocus : nextBreak) * 60;
            setTotalSeconds(full);
            setIsActive(false);
            setTimeLeft(full);
          }
        } else {
          setIsActive(false);
          const stored = res.timeLeftSeconds;
          const full = (nextMode === "focus" ? nextFocus : nextBreak) * 60;
          const left = typeof stored === "number" && stored > 0 ? stored : full;
          setTotalSeconds(full);
          setTimeLeft(left);
        }
      }
    );

    const onStorageChanged = (changes: any, areaName: string) => {
      if (areaName !== "local") return;
      const activeChanged = changes.isActive;
      const modeChanged = changes.timerMode;
      const sessionsChanged = changes.focusSessions;
      const historyChanged = changes.sessionHistory;

      if (!activeChanged && !modeChanged && !sessionsChanged && !historyChanged) return;

      chrome.storage.local.get(
        ["isActive", "timerMode", "endTime", "focusSessions", "customMinutes",
          "breakMinutes", "breakModeEnabled", "sessionHistory"],
        (res: any) => {
          setSessions(res.focusSessions || 0);
          setBreakModeEnabled(res.breakModeEnabled ?? true);
          if (res.sessionHistory) setSessionHistory(res.sessionHistory);

          if (!isActiveRef.current) {
            const nextMode: TimerMode = res.timerMode || "focus";
            setTimerMode(nextMode);
            setCustomMinutes(res.customMinutes || 25);
            setBreakMinutes(res.breakMinutes || 5);

            if (res.isActive && res.endTime) {
              const remaining = Math.max(0, Math.round((res.endTime - Date.now()) / 1000));
              if (remaining > 0) {
                const full = (nextMode === "focus" ? (res.customMinutes || 25) : (res.breakMinutes || 5)) * 60;
                setTotalSeconds(full);
                setTimeLeft(remaining);
                setIsActive(true);
                return;
              }
            }
            const nf = res.customMinutes || 25;
            const nb = res.breakMinutes || 5;
            const nm: TimerMode = res.timerMode || "focus";
            const full = (nm === "focus" ? nf : nb) * 60;
            setTotalSeconds(full);
            setTimeLeft(full);
          }
        }
      );
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const current = timeLeftRef.current;
      if (current <= 1) {
        clearInterval(interval);
        setTimeLeft(0);
        if (!completingRef.current) {
          completingRef.current = true;
          handleTimerComplete();
        }
      } else {
        setTimeLeft(current - 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const handleTimerComplete = () => {
    setIsActive(false);
    chrome.runtime.sendMessage({ type: "timerComplete" }, () => {
      completingRef.current = false;
      if (chrome.runtime.lastError) {
        chrome.storage.local.get(["focusSessions", "sessionHistory", "lastSessionDate"], (res: any) => {
          const today = getToday();
          const lastDate = res.lastSessionDate || today;
          let currentSessions = res.focusSessions || 0;
          let history: HistoryEntry[] = res.sessionHistory || [];
          if (lastDate !== today && currentSessions > 0) {
            history = [...history, { date: lastDate, count: currentSessions }].slice(-30);
            currentSessions = 0;
          }
          const newSessions = currentSessions + 1;
          setSessions(newSessions);
          setSessionHistory(history);
          chrome.storage.local.set({ isActive: false, endTime: null, focusSessions: newSessions, lastSessionDate: today, sessionHistory: history });
          chrome.action.setBadgeText({ text: "\u2713" });
          chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
        });
      }
    });
  };

  const toggleTimer = () => {
    if (!isActive) {
      const secondsToRun = timeLeft > 0 ? timeLeft : customMinutes * 60;
      const endTime = Date.now() + secondsToRun * 1000;
      if (timeLeft <= 0) setTotalSeconds(customMinutes * 60);
      chrome.storage.local.set({ isActive: true, endTime, timerMode, timeLeftSeconds: secondsToRun });
      chrome.runtime.sendMessage({ type: "startTimer", endTime }, () => {
        if (chrome.runtime.lastError) chrome.action.setBadgeText({ text: "" });
      });
      setIsActive(true);
    } else {
      chrome.storage.local.set({ isActive: false, endTime: null, timeLeftSeconds: timeLeftRef.current });
      chrome.runtime.sendMessage({ type: "stopTimer" }, () => {});
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    completingRef.current = false;
    chrome.storage.local.set({ isActive: false, endTime: null, timerMode: "focus", timeLeftSeconds: customMinutes * 60 });
    chrome.runtime.sendMessage({ type: "stopTimer" }, () => {});
    setIsActive(false);
    setTimerMode("focus");
    setTotalSeconds(customMinutes * 60);
    setTimeLeft(customMinutes * 60);
  };

  const saveSettings = () => {
    completingRef.current = false;
    chrome.storage.local.set({
      customMinutes, breakMinutes, breakModeEnabled,
      isActive: false, endTime: null, timerMode: "focus", timeLeftSeconds: customMinutes * 60,
    });
    chrome.runtime.sendMessage({ type: "stopTimer" }, () => {});
    setTimerMode("focus");
    setTotalSeconds(customMinutes * 60);
    setTimeLeft(customMinutes * 60);
    setView("timer");
  };

  const completeOnboarding = () => {
    chrome.storage.local.set({ onboardingDone: true });
    setView("timer");
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Last 7 days for history chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const entry = sessionHistory.find((h) => h.date === dateStr);
    const isToday = dateStr === getToday();
    return {
      date: dateStr,
      count: isToday ? sessions : (entry?.count || 0),
      label: isToday ? "Today" : d.toLocaleDateString("en", { weekday: "short" }),
      isToday,
    };
  });
  const maxCount = Math.max(...last7Days.map((d) => d.count), 1);
  const weekTotal = last7Days.reduce((s, d) => s + d.count, 0);
  const allTimeTotal = sessionHistory.reduce((s, d) => s + d.count, 0) + sessions;

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
          {view !== "onboarding" && (
            <>
              <button onClick={() => setView(view === "history" ? "timer" : "history")} className={`transition-colors ${view === "history" ? "text-white" : "text-slate-400 hover:text-white"}`}><BarChart2 size={20} /></button>
              <button onClick={() => setView(view === "settings" ? "timer" : "settings")} className={`transition-colors ${view === "settings" ? "text-white" : "text-slate-400 hover:text-white"}`}><Settings size={20} /></button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">

        {view === "onboarding" && (
          <div className="w-full flex flex-col items-center gap-5">
            <div className="text-5xl">🌿</div>
            <h1 className="text-xl font-bold tracking-wide">Welcome to Focus Garden</h1>
            <div className="w-full space-y-3">
              <div className="flex items-start gap-3 bg-slate-900 rounded-2xl p-4">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="font-semibold text-sm">Start a Focus Session</p>
                  <p className="text-xs text-slate-400 mt-0.5">Hit play and work until the timer ends. It keeps running even when closed.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900 rounded-2xl p-4">
                <span className="text-lg">☕</span>
                <div>
                  <p className="font-semibold text-sm">Automatic Breaks</p>
                  <p className="text-xs text-slate-400 mt-0.5">After each session a break timer starts automatically. Adjust durations in Settings.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900 rounded-2xl p-4">
                <span className="text-lg">🌳</span>
                <div>
                  <p className="font-semibold text-sm">Grow Your Garden</p>
                  <p className="text-xs text-slate-400 mt-0.5">Your garden grows with every session. View your history with the chart icon.</p>
                </div>
              </div>
            </div>
            <button onClick={completeOnboarding} className="w-full bg-green-500 text-slate-950 font-bold p-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
              Get Started
            </button>
          </div>
        )}

        {view === "settings" && (
          <div className="w-full space-y-4">
            <h2 className="text-center text-xs text-slate-500 uppercase tracking-widest">Focus Minutes</h2>
            <input type="number" value={customMinutes} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setCustomMinutes(v); }} className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-green-400 text-3xl font-mono text-center focus:outline-none focus:border-green-500" />
            <h2 className="text-center text-xs text-slate-500 uppercase tracking-widest">Break Minutes</h2>
            <input type="number" value={breakMinutes} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setBreakMinutes(v); }} className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-sky-400 text-3xl font-mono text-center focus:outline-none focus:border-sky-500" />
            <label className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-sm uppercase tracking-widest text-slate-400">Break Mode</span>
              <button type="button" onClick={() => setBreakModeEnabled((prev) => !prev)} className={`w-14 h-8 rounded-full transition-colors ${breakModeEnabled ? "bg-green-500" : "bg-slate-700"}`}>
                <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${breakModeEnabled ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </label>
            <button onClick={saveSettings} className="w-full bg-green-500 text-slate-950 font-bold p-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"><Check size={20} /> Save Settings</button>
          </div>
        )}

        {view === "history" && (
          <div className="w-full">
            <h2 className="text-center text-xs text-slate-500 uppercase tracking-widest mb-6">Last 7 Days</h2>
            <div className="flex items-end justify-between gap-2 mb-3" style={{ height: "120px" }}>
              {last7Days.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <span className="text-xs text-slate-400 h-4">{day.count > 0 ? day.count : ""}</span>
                  <div className="w-full flex items-end" style={{ height: "100px" }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${day.isToday ? "bg-green-500" : "bg-green-800"}`}
                      style={{ height: `${Math.max((day.count / maxCount) * 100, day.count > 0 ? 6 : 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2 mb-5">
              {last7Days.map((day) => (
                <div key={day.date} className="flex-1 text-center">
                  <span className={`text-xs ${day.isToday ? "text-green-400 font-semibold" : "text-slate-500"}`}>{day.label}</span>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">{sessions}</p>
                <p className="text-xs text-slate-500 mt-1">Today</p>
              </div>
              <div className="border-l border-slate-800" />
              <div>
                <p className="text-2xl font-bold text-white">{weekTotal}</p>
                <p className="text-xs text-slate-500 mt-1">This Week</p>
              </div>
              <div className="border-l border-slate-800" />
              <div>
                <p className="text-2xl font-bold text-slate-300">{allTimeTotal}</p>
                <p className="text-xs text-slate-500 mt-1">All Time</p>
              </div>
            </div>
          </div>
        )}

        {view === "timer" && (
          <div className="w-full flex flex-col items-center">
            <div className={`mb-6 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest ${timerMode === "focus" ? "bg-green-500/20 text-green-300" : "bg-sky-500/20 text-sky-300"}`}>
              {timerMode === "focus" ? "Focus" : "Break"}
            </div>

            {/* Circular progress ring */}
            {(() => {
              const size = 200;
              const strokeWidth = 8;
              const radius = (size - strokeWidth) / 2;
              const circumference = 2 * Math.PI * radius;
              const progress = totalSeconds > 0 ? timeLeft / totalSeconds : 1;
              const dashOffset = circumference * (1 - progress);
              const color = timerMode === "focus" ? "#22c55e" : "#0ea5e9";
              return (
                <div className="relative mb-8" style={{ width: size, height: size }}>
                  <svg width={size} height={size} className="-rotate-90" style={{ position: "absolute", top: 0, left: 0 }}>
                    {/* Track */}
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
                    {/* Progress */}
                    <circle
                      cx={size / 2} cy={size / 2} r={radius}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{ transition: "stroke-dashoffset 0.5s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl font-mono font-light tracking-tighter">
                      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-8 mb-12">
              <button onClick={resetTimer} className="p-4 bg-slate-900 rounded-full text-slate-400 hover:text-white transition-colors"><RotateCcw size={24} /></button>
              <button onClick={toggleTimer} className={`w-24 h-24 rounded-full flex items-center justify-center active:scale-90 transition-transform ${timerMode === "focus" ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "bg-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.3)]"} text-slate-950`}>
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
