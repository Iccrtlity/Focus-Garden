import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Play, RotateCcw, Leaf, Pause, Settings, Check, BarChart2 } from "lucide-react";

type TimerMode = "focus" | "break";
type View = "timer" | "settings" | "history" | "onboarding";
type PlantSpecies = "herb" | "succulent" | "flower";

interface HistoryEntry {
  date: string;
  count: number;
}

interface StorageValues {
  endTime?: number | null;
  isActive?: boolean;
  focusSessions?: number;
  totalFocusSessions?: number;
  customMinutes?: number;
  breakMinutes?: number;
  breakModeEnabled?: boolean;
  timerMode?: TimerMode;
  timeLeftSeconds?: number;
  sessionHistory?: HistoryEntry[];
  lastSessionDate?: string;
  onboardingDone?: boolean;
  plantName?: string;
  plantSpecies?: string;
}

interface StorageChange {
  newValue?: unknown;
  oldValue?: unknown;
}

interface ExtensionApi {
  action?: {
    setBadgeText: (details: { text: string }) => void;
    setBadgeBackgroundColor: (details: { color: string }) => void;
  };
  runtime?: {
    getURL: (path: string) => string;
    lastError?: unknown;
    sendMessage: (message: unknown, callback?: () => void) => void;
  };
  storage?: {
    local: {
      get: (keys: string[], callback: (items: StorageValues) => void) => void;
      set: (items: StorageValues) => void;
    };
    onChanged: {
      addListener: (callback: (changes: Record<string, StorageChange>, areaName: string) => void) => void;
      removeListener: (callback: (changes: Record<string, StorageChange>, areaName: string) => void) => void;
    };
  };
}

interface ExtensionWindow extends Window {
  chrome?: ExtensionApi;
  browser?: ExtensionApi;
}

function getExtensionApi(): ExtensionApi | undefined {
  const extensionWindow = window as ExtensionWindow;
  return extensionWindow.chrome ?? extensionWindow.browser;
}

function getToday(): string {
  return formatLocalDate(new Date());
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStoredPlantSpecies(value: string | undefined): PlantSpecies {
  if (value === "succulent" || value === "flower") return value;
  return "herb";
}

function getPlantImagePath(totalSessions: number, extensionApi?: ExtensionApi): string {
  let imageName: string;
  if (totalSessions >= 10) {
    imageName = "tree.png";
  } else if (totalSessions >= 5) {
    imageName = "sprout.png";
  } else {
    imageName = "seedling.png";
  }

  return extensionApi?.runtime?.getURL(imageName) ?? `./${imageName}`;
}

function updatePlantDisplay(totalSessions: number, species: PlantSpecies, extensionApi?: ExtensionApi): void {
  const plantDisplay = document.getElementById("plant-display") as HTMLImageElement | null;
  if (!plantDisplay) return;

  plantDisplay.src = getPlantImagePath(totalSessions, extensionApi);
  plantDisplay.alt = `${species} plant growth level for ${totalSessions} completed sessions`;
}

function App() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalFocusSessions, setTotalFocusSessions] = useState(0);
  const [view, setView] = useState<View>("timer");
  const [customMinutes, setCustomMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [breakModeEnabled, setBreakModeEnabled] = useState(true);
  const [timerMode, setTimerMode] = useState<TimerMode>("focus");
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(() => !getExtensionApi()?.storage);
  const [plantName, setPlantName] = useState("My Plant");
  const [plantSpecies, setPlantSpecies] = useState<PlantSpecies>("herb");

  const timeLeftRef = useRef(timeLeft);
  const isActiveRef = useRef(isActive);
  const completingRef = useRef(false);

  const extensionApi = useMemo(() => getExtensionApi(), []);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    extensionApi?.action?.setBadgeText({ text: "" });
  }, [extensionApi]);

  useEffect(() => {
    updatePlantDisplay(totalFocusSessions, plantSpecies, extensionApi);
  }, [extensionApi, totalFocusSessions, plantSpecies]);

  useEffect(() => {
    if (!extensionApi?.storage) {
      return;
    }

    extensionApi.storage.local.get(
      ["endTime", "isActive", "focusSessions", "totalFocusSessions", "customMinutes", "breakMinutes",
        "breakModeEnabled", "timerMode", "timeLeftSeconds", "sessionHistory",
        "lastSessionDate", "onboardingDone", "plantName", "plantSpecies"],
      (res) => {
        // Daily reset
        const today = getToday();
        const lastDate = res.lastSessionDate || today;
        let currentSessions = res.focusSessions || 0;
        let history: HistoryEntry[] = res.sessionHistory || [];

        if (lastDate !== today && currentSessions > 0) {
          history = [...history, { date: lastDate, count: currentSessions }].slice(-30);
          currentSessions = 0;
          extensionApi.storage?.local.set({ focusSessions: 0, lastSessionDate: today, sessionHistory: history });
        } else if (!res.lastSessionDate) {
          extensionApi.storage?.local.set({ lastSessionDate: today });
        }

        setSessions(currentSessions);
        setTotalFocusSessions(res.totalFocusSessions || 0);
        setSessionHistory(history);
        setPlantName(res.plantName || "My Plant");
        setPlantSpecies(getStoredPlantSpecies(res.plantSpecies));

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
        setStorageLoaded(true);
      }
    );

    const onStorageChanged = (changes: Record<string, StorageChange>, areaName: string) => {
      if (areaName !== "local") return;
      const activeChanged = changes.isActive;
      const modeChanged = changes.timerMode;
      const sessionsChanged = changes.focusSessions;
      const totalSessionsChanged = changes.totalFocusSessions;
      const historyChanged = changes.sessionHistory;

      if (!activeChanged && !modeChanged && !sessionsChanged && !totalSessionsChanged && !historyChanged) return;

      extensionApi.storage?.local.get(
        ["isActive", "timerMode", "endTime", "focusSessions", "totalFocusSessions", "customMinutes",
          "breakMinutes", "breakModeEnabled", "sessionHistory", "timeLeftSeconds"],
        (res) => {
          setSessions(res.focusSessions || 0);
          setTotalFocusSessions(res.totalFocusSessions || 0);
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
            // Use saved remaining time when paused, only reset to full on a fresh reset/complete
            setTimeLeft(res.timeLeftSeconds ?? full);
          }
        }
      );
    };

    extensionApi.storage.onChanged.addListener(onStorageChanged);
    return () => extensionApi.storage?.onChanged.removeListener(onStorageChanged);
  }, [extensionApi]);

  const handleTimerComplete = useCallback(() => {
    setIsActive(false);

    if (!extensionApi?.runtime || !extensionApi.storage) {
      completingRef.current = false;
      return;
    }

    extensionApi.runtime.sendMessage({ type: "timerComplete" }, () => {
      completingRef.current = false;
      if (extensionApi.runtime?.lastError) {
        // Fallback when service worker is unreachable
        extensionApi.storage?.local.get(
          ["focusSessions", "totalFocusSessions", "sessionHistory", "lastSessionDate", "timerMode", "customMinutes", "plantName", "plantSpecies"],
          (res) => {
            const mode: TimerMode = res.timerMode || "focus";
            if (mode === "break") {
              const full = (res.customMinutes || 25) * 60;
              setTimerMode("focus");
              setTimeLeft(full);
              setTotalSeconds(full);
              extensionApi.storage?.local.set({ isActive: false, endTime: null, timerMode: "focus", timeLeftSeconds: full });
              extensionApi.action?.setBadgeText({ text: "\u2713" });
              extensionApi.action?.setBadgeBackgroundColor({ color: "#0ea5e9" });
              return;
            }
            const today = getToday();
            const lastDate = res.lastSessionDate || today;
            let currentSessions = res.focusSessions || 0;
            const newTotalSessions = (res.totalFocusSessions || 0) + 1;
            let history: HistoryEntry[] = res.sessionHistory || [];
            if (lastDate !== today && currentSessions > 0) {
              history = [...history, { date: lastDate, count: currentSessions }].slice(-30);
              currentSessions = 0;
            }
            const newSessions = currentSessions + 1;
            setSessions(newSessions);
            setTotalFocusSessions(newTotalSessions);
            setSessionHistory(history);
            setPlantName(res.plantName || "My Plant");
            setPlantSpecies(getStoredPlantSpecies(res.plantSpecies));
            extensionApi.storage?.local.set({
              isActive: false,
              endTime: null,
              focusSessions: newSessions,
              totalFocusSessions: newTotalSessions,
              lastSessionDate: today,
              sessionHistory: history,
            });
            extensionApi.action?.setBadgeText({ text: "\u2713" });
            extensionApi.action?.setBadgeBackgroundColor({ color: "#22c55e" });
          }
        );
      }
    });
  }, [extensionApi]);

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
  }, [handleTimerComplete, isActive]);

  const toggleTimer = () => {
    if (!isActive) {
      const secondsToRun = timeLeft > 0 ? timeLeft : customMinutes * 60;
      const endTime = Date.now() + secondsToRun * 1000;
      if (timeLeft <= 0) setTotalSeconds(customMinutes * 60);
      extensionApi?.storage?.local.set({ isActive: true, endTime, timerMode, timeLeftSeconds: secondsToRun });
      extensionApi?.runtime?.sendMessage({ type: "startTimer", endTime }, () => {
        if (extensionApi.runtime?.lastError) extensionApi.action?.setBadgeText({ text: "" });
      });
      setIsActive(true);
    } else {
      extensionApi?.storage?.local.set({ isActive: false, endTime: null, timeLeftSeconds: timeLeftRef.current });
      extensionApi?.runtime?.sendMessage({ type: "stopTimer" }, () => { void extensionApi.runtime?.lastError; });
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    completingRef.current = false;
    extensionApi?.storage?.local.set({ isActive: false, endTime: null, timerMode: "focus", timeLeftSeconds: customMinutes * 60 });
    extensionApi?.runtime?.sendMessage({ type: "stopTimer" }, () => { void extensionApi.runtime?.lastError; });
    setIsActive(false);
    setTimerMode("focus");
    setTotalSeconds(customMinutes * 60);
    setTimeLeft(customMinutes * 60);
  };

  const saveSettings = () => {
    completingRef.current = false;
    extensionApi?.storage?.local.set({
      customMinutes, breakMinutes, breakModeEnabled, plantName, plantSpecies,
      isActive: false, endTime: null, timerMode: "focus", timeLeftSeconds: customMinutes * 60,
    });
    extensionApi?.runtime?.sendMessage({ type: "stopTimer" }, () => { void extensionApi.runtime?.lastError; });
    setIsActive(false);
    setTimerMode("focus");
    setTotalSeconds(customMinutes * 60);
    setTimeLeft(customMinutes * 60);
    setView("timer");
  };

  const completeOnboarding = () => {
    extensionApi?.storage?.local.set({ onboardingDone: true });
    setView("timer");
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Last 7 days for history chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = formatLocalDate(d);
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
          <a href="https://github.com/SpaceKeep/Focus-Garden" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
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
            <div className="border-t border-slate-800 pt-4">
              <h2 className="text-center text-xs text-slate-500 uppercase tracking-widest mb-4">Plant Customization</h2>
              <input type="text" value={plantName} onChange={(e) => setPlantName(e.target.value || 'My Plant')} placeholder="Name your plant..." maxLength={20} className="w-full bg-slate-900 border border-slate-800 p-3 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-green-500 mb-4" />
              <div className="flex gap-2">
                {(['herb', 'succulent', 'flower'] as const).map(s => (<button key={s} onClick={() => setPlantSpecies(s)} className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg ${plantSpecies === s ? 'bg-green-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>{s === 'herb' ? '🌿' : s === 'succulent' ? '🌵' : '🌸'} {s}</button>))}
              </div>
            </div>
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
                <div className="relative mb-8" style={{ width: size, height: size, visibility: storageLoaded ? "visible" : "hidden" }}>
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
                      style={{ transition: isActive ? "stroke-dashoffset 0.5s ease" : "none" }}
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
            <div className="w-full bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 text-center relative">
              <img
                id="plant-display"
                src={getPlantImagePath(totalFocusSessions, extensionApi)}
                alt={`${plantSpecies} plant growth level for ${totalFocusSessions} completed sessions`}
                className="mx-auto mb-3 h-24 w-24 object-contain drop-shadow-md"
              />
              <p className="text-green-400 font-semibold">{plantName}</p>
              <p className="text-white font-medium">{sessions} Sessions today</p>
              <p className="mt-1 text-xs text-slate-400">{totalFocusSessions} total completed sessions</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
