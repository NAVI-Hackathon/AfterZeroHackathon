"use client";

/**
 * Mock-site side of NAVI navigation: go to the page, switch to the right tab, scroll and
 * briefly spotlight the target (data-tour-id). Triggered by
 * 1. navi:navigate messages from the embedded NAVI (via NaviLauncher), or
 * 2. ?focus=<data-tour-id> when standalone NAVI opens this site in a new tab.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { revealTabPanels } from "@/components/site/Tabs";
import { NaviLauncher, type NaviDestination } from "./NaviLauncher";

const ANCHOR = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIND_TIMEOUT_MS = 4000;
const SPOTLIGHT_MS = 2800;

type Pending = { anchor: string; label: string; id: number };

function waitForElement(selector: string, timeout: number): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const started = performance.now();
    const tick = () => {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) resolve(element);
      else if (performance.now() - started > timeout) resolve(null);
      else setTimeout(tick, 80);
    };
    tick();
  });
}

function TourController({ pending }: { pending: Pending | null }) {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState("");
  const done = useRef<number | null>(null);

  useEffect(() => {
    if (!pending || done.current === pending.id) return;
    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void (async () => {
      const target = await waitForElement(`[data-tour-id="${pending.anchor}"]`, FIND_TIMEOUT_MS);
      if (cancelled || !target) return;
      done.current = pending.id;
      revealTabPanels(target);
      // Let the tab panel become visible before measuring/scrolling.
      await new Promise(resolve => setTimeout(resolve, 60));
      target.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      target.classList.remove("navi-spotlight");
      void target.offsetWidth; // restart the animation when the same target is chosen twice
      target.classList.add("navi-spotlight");
      target.dataset.naviLabel = pending.label;
      setAnnouncement(`已帶你到「${pending.label}」`);
      setTimeout(() => { target.classList.remove("navi-spotlight"); delete target.dataset.naviLabel; }, SPOTLIGHT_MS);
    })();
    return () => { cancelled = true; };
  }, [pending, pathname]);

  return <p className="sr-only" role="status" aria-live="polite">{announcement}</p>;
}

/** Reads ?focus= once per navigation (standalone NAVI opens links in a new tab). */
function FocusParam({ onFocus }: { onFocus: (anchor: string) => void }) {
  const params = useSearchParams();
  const focus = params.get("focus");
  useEffect(() => { if (focus && ANCHOR.test(focus)) onFocus(focus); }, [focus, onFocus]);
  return null;
}

export function NaviHost() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);
  const counter = useRef(0);

  const onNavigate = useCallback((destination: NaviDestination) => {
    const id = ++counter.current;
    if (destination.anchor) setPending({ anchor: destination.anchor, label: destination.label, id });
    if (destination.path !== pathname) router.push(destination.path, { scroll: !destination.anchor });
  }, [pathname, router]);

  const onFocus = useCallback((anchor: string) => {
    setPending({ anchor, label: "NAVI 建議的位置", id: ++counter.current });
  }, []);

  return (
    <>
      <Suspense fallback={null}><FocusParam onFocus={onFocus} /></Suspense>
      <TourController pending={pending} />
      <NaviLauncher onNavigate={onNavigate} />
    </>
  );
}
