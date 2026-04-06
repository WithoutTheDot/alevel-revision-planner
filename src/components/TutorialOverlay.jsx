import { useEffect, useRef, useState } from 'react';
import { useTutorial } from '../contexts/TutorialContext';

const PADDING = 12;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT_EST = 180;

function useLazyTargetRect(targetId, stepKey) {
  const [rect, setRect] = useState(null);
  const frameRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    setRect(null);
    if (!targetId) return;

    let attempts = 0;
    const MAX = 60;

    function capture(el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    }

    function tryAcquire() {
      const el = document.querySelector(`[data-tutorial-id="${targetId}"]`) || document.getElementById(targetId);
      if (el && capture(el)) {
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new ResizeObserver(() => {
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        });
        observerRef.current.observe(el);
        return;
      }
      if (++attempts < MAX) frameRef.current = requestAnimationFrame(tryAcquire);
    }

    frameRef.current = requestAnimationFrame(tryAcquire);

    function onUpdate() {
      const el = document.querySelector(`[data-tutorial-id="${targetId}"]`) || document.getElementById(targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    }
    window.addEventListener('scroll', onUpdate, { passive: true });
    window.addEventListener('resize', onUpdate, { passive: true });

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (observerRef.current) observerRef.current.disconnect();
      window.removeEventListener('scroll', onUpdate);
      window.removeEventListener('resize', onUpdate);
    };
  }, [targetId, stepKey]);

  return rect;
}

function tooltipPosition(rect, vpW, vpH) {
  if (!rect) {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }
  const { top, left, width, height } = rect;
  const spaceBelow = vpH - (top + height) - PADDING;
  const spaceAbove = top - PADDING;

  if (spaceBelow >= TOOLTIP_HEIGHT_EST) {
    return { position: 'fixed', top: top + height + PADDING, left: Math.max(PADDING, Math.min(left, vpW - TOOLTIP_WIDTH - PADDING)) };
  }
  if (spaceAbove >= TOOLTIP_HEIGHT_EST) {
    return { position: 'fixed', top: top - TOOLTIP_HEIGHT_EST - PADDING, left: Math.max(PADDING, Math.min(left, vpW - TOOLTIP_WIDTH - PADDING)) };
  }
  if (vpW - (left + width) - PADDING >= TOOLTIP_WIDTH) {
    return { position: 'fixed', top: Math.max(PADDING, top + height / 2 - TOOLTIP_HEIGHT_EST / 2), left: left + width + PADDING };
  }
  return { position: 'fixed', top: Math.max(PADDING, top + height / 2 - TOOLTIP_HEIGHT_EST / 2), left: Math.max(PADDING, left - TOOLTIP_WIDTH - PADDING) };
}

export default function TutorialOverlay() {
  const { active, step, currentStep, actionDone, advance, skip, complete, totalSteps } = useTutorial();
  const [vpSize, setVpSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    function onResize() { setVpSize({ w: window.innerWidth, h: window.innerHeight }); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const targetRect = useLazyTargetRect(step?.targetId ?? null, step?.key ?? null);

  if (!active || !step) return null;

  const { w: vpW, h: vpH } = vpSize;
  const tipStyle = tooltipPosition(targetRect, vpW, vpH);
  const isNextDisabled = step.requiresAction && !actionDone;
  const p = PADDING;

  function handleNext() {
    if (step.isFinal) complete();
    else advance();
  }

  return (
    <>
      {/* Dark backdrop */}
      {targetRect ? (
        <svg
          style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9998 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tut-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - p}
                y={targetRect.top - p}
                width={targetRect.width + p * 2}
                height={targetRect.height + p * 2}
                rx={8} ry={8}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tut-mask)" />
        </svg>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998, pointerEvents: 'none' }} />
      )}

      {/* Tooltip card */}
      <div
        style={{ ...tipStyle, width: TOOLTIP_WIDTH, zIndex: 9999, pointerEvents: 'auto' }}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-base leading-tight pr-2">{step.title}</h3>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{currentStep + 1} / {totalSteps}</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={skip}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Skip tutorial
          </button>
          <button
            onClick={handleNext}
            disabled={isNextDisabled}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {step.isFinal ? 'Finish' : 'Next →'}
          </button>
        </div>
        {isNextDisabled && (
          <p className="text-xs text-amber-600 mt-2 text-right">Complete the action above to continue.</p>
        )}
      </div>
    </>
  );
}
