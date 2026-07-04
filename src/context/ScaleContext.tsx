'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const SCALE_STEPS = [80, 90, 100, 110, 120, 135, 150, 170, 200];
const DEFAULT_SCALE = 100;

interface ScaleContextValue {
  scale: number;
  increaseScale: () => void;
  decreaseScale: () => void;
  resetScale: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}

const ScaleContext = createContext<ScaleContextValue>({
  scale: DEFAULT_SCALE,
  increaseScale: () => {},
  decreaseScale: () => {},
  resetScale: () => {},
  canIncrease: true,
  canDecrease: true,
});

export function ScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState(DEFAULT_SCALE);

  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem('editormd_scale') || '100', 10);
      if (SCALE_STEPS.includes(saved)) {
        setScaleState(saved);
        applyScale(saved);
      }
    } catch {}
  }, []);

  const applyScale = (s: number) => {
    // Set root document HTML font-size as percentage so all UI rem/em values scale correctly
    document.documentElement.style.fontSize = `${s}%`;
    document.documentElement.style.setProperty('--ui-scale', String(s / 100));
  };

  const setScale = (s: number) => {
    setScaleState(s);
    applyScale(s);
    try { localStorage.setItem('editormd_scale', String(s)); } catch {}
  };

  const increaseScale = () => {
    const idx = SCALE_STEPS.indexOf(scale);
    if (idx < SCALE_STEPS.length - 1) setScale(SCALE_STEPS[idx + 1]);
  };

  const decreaseScale = () => {
    const idx = SCALE_STEPS.indexOf(scale);
    if (idx > 0) setScale(SCALE_STEPS[idx - 1]);
  };

  const resetScale = () => setScale(DEFAULT_SCALE);

  const canIncrease = SCALE_STEPS.indexOf(scale) < SCALE_STEPS.length - 1;
  const canDecrease = SCALE_STEPS.indexOf(scale) > 0;

  return (
    <ScaleContext.Provider value={{ scale, increaseScale, decreaseScale, resetScale, canIncrease, canDecrease }}>
      {children}
    </ScaleContext.Provider>
  );
}

export function useScale() {
  return useContext(ScaleContext);
}
