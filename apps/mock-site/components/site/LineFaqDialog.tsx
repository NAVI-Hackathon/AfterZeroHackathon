"use client";

import { useRef } from "react";

/**
 * 重現官網痛點：「常見問題」不是問答頁，只會跳出 LINE QR Code。
 * QR Code 只是示意方塊，不是真的條碼。
 */
export function LineFaqDialog({ className }: { className: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        data-tour-id="home-faq"
        onClick={() => dialogRef.current?.showModal()}
        className={className}
      >
        常見問題
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="line-faq-title"
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-lg p-6 text-center backdrop:bg-black/50"
      >
        <h2 id="line-faq-title" className="text-lg font-semibold text-ink">
          加入 LINE 官方帳號
        </h2>
        <p className="mt-2 text-sm text-muted">請使用手機掃描 QR Code，於 LINE 查詢常見問題。</p>
        <div
          aria-label="QR Code 示意圖"
          className="mx-auto mt-4 flex size-40 items-center justify-center border-4 border-dashed border-neutral-300 text-sm text-neutral-400"
        >
          QR Code（示意）
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="mt-5 rounded-full bg-brand px-6 py-1.5 text-sm text-white hover:bg-brand-dark"
        >
          關閉
        </button>
      </dialog>
    </>
  );
}
