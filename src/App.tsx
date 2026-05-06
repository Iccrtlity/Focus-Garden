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
    // 1. Initial alles laden
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
  };

  const toggleTimer = () => {
    if (!isActive) {
      const endTime = Date.now() + timeLeft * 1000;
      chrome.storage.local.set({ isActive: true, endTime });
      setIsActive(true);
    } else {
      chrome.storage.local.set({ isActive: false, endTime: null });
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    chrome.storage.local.set({ isActive: false, endTime: null });
    setIsActive(false);
    setTimeLeft(customMinutes * 60);
  };

  const saveSettings = () => {
    chrome.storage.local.set({ customMinutes, isActive: false, endTime: null });
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
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-slate-400 hover:text-white"><Settings size={20} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {isSettingsOpen ? (
          <div className="w-full space-y-4">
            <h2 className="text-center text-xs text-slate-500 uppercase tracking-widest">Minutes</h2>
            <input type="number" value={customMinutes} onChange={(e) => setCustomMinutes(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-green-400 text-3xl font-mono text-center focus:outline-none focus:border-green-500" />
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
