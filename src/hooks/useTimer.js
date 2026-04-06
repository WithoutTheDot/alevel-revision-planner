import { useState, useEffect, useRef } from 'react';

const PREFIX = 'timer_';

function readAllTimers() {
  const timers = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      try {
        timers[key] = JSON.parse(localStorage.getItem(key));
      } catch (_) {}
    }
  }
  return timers;
}

export function useTimer() {
  const [timers, setTimers] = useState(() => readAllTimers());
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(readAllTimers());
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  function startTimer(key, expectedMins) {
    const data = { startedAt: Date.now(), expectedMins };
    localStorage.setItem(key, JSON.stringify(data));
    setTimers((prev) => ({ ...prev, [key]: data }));
  }

  function stopTimer(key) {
    localStorage.removeItem(key);
    setTimers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function getTimerData(key) {
    return timers[key] ?? null;
  }

  function getElapsed(key) {
    const data = timers[key];
    if (!data) return null;
    return (Date.now() - data.startedAt) / 60000;
  }

  return { startTimer, stopTimer, getTimerData, getElapsed };
}
