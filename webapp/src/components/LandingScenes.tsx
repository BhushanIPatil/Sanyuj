"use client";

import { useEffect, useState } from "react";

function useSceneCycle(length: number, holdMs = 2200) {
  const [phase, setPhase] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) {
      setPhase(Math.max(0, length - 1));
      return;
    }
    const id = window.setInterval(() => {
      setPhase((p) => (p + 1) % length);
    }, holdMs);
    return () => window.clearInterval(id);
  }, [holdMs, length, reduced]);

  return phase;
}

/** Hero: everyday ask → Sanyuj answer → live provider nearby. */
export function SeekerScene() {
  const phase = useSceneCycle(4, 2400);

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div
        aria-hidden
        className="land-glow pointer-events-none absolute -inset-8 rounded-[40%] bg-[radial-gradient(circle_at_center,rgba(46,134,214,0.22),transparent_65%)]"
      />
      <div className="land-float relative space-y-3">
        {/* Problem */}
        <div
          key={`ask-${phase >= 0}`}
          className={`land-slide-in rounded-[22px] rounded-bl-md bg-white/90 px-4 py-3 shadow-card backdrop-blur ${
            phase === 0 ? "ring-2 ring-blue/20" : ""
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">You</p>
          <p className="mt-1 font-display text-[15px] font-bold leading-snug text-ink sm:text-base">
            Anyone know a plumber who can come right now?
          </p>
        </div>

        {/* Typing / answer */}
        <div className="flex justify-end">
          {phase === 0 ? (
            <div className="land-fade-in rounded-[18px] rounded-br-md bg-blue-soft px-4 py-3 text-blue-deep">
              <span className="land-typing" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : (
            <div
              key={`ans-${phase}`}
              className="land-slide-in-right max-w-[92%] rounded-[22px] rounded-br-md grad-hero px-4 py-3 text-white shadow-card"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Sanyuj</p>
              <p className="mt-1 font-display text-[15px] font-bold leading-snug sm:text-base">
                Yes — live plumbers near your pincode.
              </p>
            </div>
          )}
        </div>

        {/* Live provider reveal */}
        {phase >= 2 ? (
          <div
            key={`live-${phase}`}
            className="land-pop flex items-center gap-3 rounded-[20px] border border-line bg-white p-3.5 shadow-pop"
          >
            <div className="relative">
              <span className="absolute inset-[-4px] animate-pulse-ring rounded-[16px] border-2 border-green-deep" />
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[15px] bg-blue-soft font-display text-sm font-bold text-blue-deep">
                RP
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold">Ramesh Patil</p>
              <p className="text-xs text-ink-soft">Plumber · 0.6 km</p>
            </div>
            <span className="rounded-full bg-green-soft px-2.5 py-1 text-[10px] font-bold text-green-deep">
              LIVE
            </span>
          </div>
        ) : (
          <div className="h-[68px]" aria-hidden />
        )}

        {/* Interest ping */}
        {phase >= 3 ? (
          <div key="interest" className="land-fade-up flex justify-center">
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-ink-soft shadow-card">
              +2 interested nearby
            </span>
          </div>
        ) : (
          <div className="h-8" aria-hidden />
        )}
      </div>
    </div>
  );
}

/** Job post → interest → live — product value in three beats. */
export function ValueLoop() {
  const phase = useSceneCycle(3, 2600);
  const steps = [
    {
      label: "Post a job",
      detail: "Leak in bathroom · Today",
      tone: "bg-blue-soft text-blue-deep",
    },
    {
      label: "Get interest",
      detail: "3 providers ready",
      tone: "bg-indigo-soft text-indigo",
    },
    {
      label: "Live near you",
      detail: "Call · Hire · Done",
      tone: "bg-green-soft text-green-deep",
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {steps.map((step, i) => {
          const active = phase === i;
          return (
            <div key={step.label} className="flex items-center gap-2 sm:gap-3">
              <div
                className={`rounded-full px-3 py-2 text-center transition-all duration-500 sm:px-4 ${
                  active
                    ? `${step.tone} scale-105 shadow-card`
                    : "bg-white/60 text-ink-faint"
                }`}
              >
                <p
                  className={`text-[11px] font-bold uppercase tracking-wide sm:text-xs ${
                    active ? "" : "text-ink-faint"
                  }`}
                >
                  {step.label}
                </p>
              </div>
              {i < steps.length - 1 ? (
                <span
                  className={`hidden h-px w-6 transition-colors duration-500 sm:block ${
                    phase > i ? "bg-green" : "bg-line"
                  }`}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex min-h-[120px] items-center justify-center">
        <div
          key={phase}
          className="land-pop w-full max-w-sm rounded-[24px] border border-line bg-white px-5 py-5 text-center shadow-card"
        >
          <p className="eyebrow text-ink-faint">{steps[phase].label}</p>
          <p className="mt-2 font-display text-xl font-extrabold text-ink">{steps[phase].detail}</p>
        </div>
      </div>
    </div>
  );
}

/** Provider: no leads → free listing → nearby job. */
export function ProviderScene() {
  const phase = useSceneCycle(3, 2600);

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div
        aria-hidden
        className="land-glow pointer-events-none absolute -inset-8 rounded-[40%] bg-[radial-gradient(circle_at_center,rgba(31,174,122,0.2),transparent_65%)]"
      />
      <div className="land-float relative space-y-3" style={{ animationDelay: "0.4s" }}>
        <div
          className={`land-slide-in rounded-[22px] rounded-bl-md bg-white/90 px-4 py-3 shadow-card backdrop-blur ${
            phase === 0 ? "ring-2 ring-green/25" : ""
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Provider</p>
          <p className="mt-1 font-display text-[15px] font-bold leading-snug text-ink sm:text-base">
            I do good work… but how do neighbours find me?
          </p>
        </div>

        <div className="flex justify-end">
          {phase === 0 ? (
            <div className="land-fade-in rounded-[18px] rounded-br-md bg-green-soft px-4 py-3 text-green-deep">
              <span className="land-typing" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : (
            <div
              key={`prov-ans-${phase}`}
              className="land-slide-in-right max-w-[92%] rounded-[22px] rounded-br-md bg-[#0f1720] px-4 py-3 text-white shadow-card"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">Sanyuj</p>
              <p className="mt-1 font-display text-[15px] font-bold leading-snug sm:text-base">
                List free. Market yourself to people nearby.
              </p>
            </div>
          )}
        </div>

        {phase >= 2 ? (
          <div key="job-ping" className="land-pop rounded-[20px] border border-line bg-white p-4 shadow-pop">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-deep">
                  New job nearby
                </p>
                <p className="mt-1 font-display text-sm font-bold">Fix kitchen tap · 1.2 km</p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-soft px-2.5 py-1 text-[10px] font-bold text-amber">
                Open
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-blue-deep">Send interest →</p>
          </div>
        ) : (
          <div className="h-[96px]" aria-hidden />
        )}
      </div>
    </div>
  );
}
