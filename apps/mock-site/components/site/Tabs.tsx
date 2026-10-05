"use client";

/**
 * 仿官網分頁標籤。所有分頁內容都會輸出到 DOM（非作用中的加 hidden），
 * 導覽 overlay 才找得到藏在其他分頁裡的 data-tour-id 目標。
 *
 * 切換分頁的三種方式：
 * 1. 點擊標籤
 * 2. 網址 hash：/services/policy-change#change-beneficiary
 * 3. 導覽程式呼叫 revealTabPanels(targetElement)，會沿著祖先切換到目標所在的分頁
 */
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { panelTourId, tabTourId } from "./tour-ids";

export const ACTIVATE_TAB_EVENT = "site:activate-tab";

type ActivateTabDetail = { tabId: string };

export type TabItem = {
  /** kebab-case，同時是網址 hash 與 data-tour-id 的一部分，全站唯一 */
  id: string;
  label: string;
  content: ReactNode;
};

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const readHash = () => decodeURIComponent(window.location.hash.slice(1));
const readServerHash = () => "";

export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const hash = useSyncExternalStore(subscribeHash, readHash, readServerHash);
  // 記下選取當下的 hash；之後 hash 若改成本組的分頁 id，以 hash 為準
  const [selected, setSelected] = useState<{ id: string; hash: string } | null>(null);
  const idsKey = items.map((item) => item.id).join("|");

  useEffect(() => {
    const ids = idsKey.split("|");
    const onActivate = (event: Event) => {
      const { tabId } = (event as CustomEvent<ActivateTabDetail>).detail;
      if (ids.includes(tabId)) setSelected({ id: tabId, hash: readHash() });
    };
    document.addEventListener(ACTIVATE_TAB_EVENT, onActivate);
    return () => document.removeEventListener(ACTIVATE_TAB_EVENT, onActivate);
  }, [idsKey]);

  const hashTab = items.some((item) => item.id === hash) ? hash : null;
  const activeId =
    selected && selected.hash === hash
      ? selected.id
      : (hashTab ?? selected?.id ?? items[0]?.id);

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex overflow-x-auto border-b-2 border-brand [scrollbar-width:thin]"
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={active}
              aria-controls={`panel-${item.id}`}
              data-tour-id={tabTourId(item.id)}
              onClick={() => setSelected({ id: item.id, hash: readHash() })}
              className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm transition-colors md:px-5 md:text-[15px] ${
                active
                  ? "bg-brand font-semibold text-white"
                  : "bg-neutral-100 text-ink hover:bg-brand-light"
              } mr-0.5`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`panel-${item.id}`}
          aria-labelledby={`tab-${item.id}`}
          data-tab-panel={item.id}
          data-tour-id={panelTourId(item.id)}
          hidden={item.id !== activeId}
          className="py-6"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

/** 讓目標元素可見：由內而外切換它所在的每一層分頁 */
export function revealTabPanels(target: Element) {
  let panel = target.closest<HTMLElement>("[data-tab-panel]");
  while (panel) {
    const tabId = panel.dataset.tabPanel;
    if (tabId) {
      document.dispatchEvent(
        new CustomEvent<ActivateTabDetail>(ACTIVATE_TAB_EVENT, { detail: { tabId } }),
      );
    }
    panel = panel.parentElement?.closest<HTMLElement>("[data-tab-panel]") ?? null;
  }
}
