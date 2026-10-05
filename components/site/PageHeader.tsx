import Link from "next/link";
import type { ReactNode } from "react";
import { displayOfficialUrl, SITE_ROUTES } from "./routes";

export type Crumb = { label: string; href?: string };

/** 頁面標題列：麵包屑 + 綠色標題帶 */
export function PageHeader({ title, crumbs }: { title: string; crumbs: Crumb[] }) {
  return (
    <div className="bg-brand-light">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <nav aria-label="麵包屑" className="text-xs text-muted">
          <ol className="flex flex-wrap gap-1">
            <li><Link href={SITE_ROUTES.home} className="hover:text-brand">首頁</Link></li>
            {crumbs.map((crumb) => (
              <li key={crumb.label} className="before:mr-1 before:content-['›']">
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-brand">{crumb.label}</Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-2 text-2xl font-bold text-brand-deep md:text-3xl">{title}</h1>
      </div>
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">{children}</div>;
}

/** 資料來源標示（純文字，不連到真實官網） */
export function SourceNote({ urls, retrievedAt }: { urls: string[]; retrievedAt: string }) {
  const unique = [...new Set(urls)];
  return (
    <p className="mt-8 border-t border-neutral-200 pt-3 text-xs text-muted">
      資料來源：法國巴黎人壽官網 {unique.map(displayOfficialUrl).join("、")}（擷取日期 {retrievedAt}）
    </p>
  );
}
