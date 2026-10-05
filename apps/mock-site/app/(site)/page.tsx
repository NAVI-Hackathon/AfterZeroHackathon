import Link from "next/link";
import { LineFaqDialog } from "@/components/site/LineFaqDialog";
import { SITE_ROUTES } from "@/components/site/routes";
import { seed } from "./_lib/seed";

const QUICK_LINKS = [
  { label: "常用表單下載", href: SITE_ROUTES.forms, tourId: "home-quick-forms", icon: "表" },
  { label: "保單變更", href: SITE_ROUTES.policyChange, tourId: "home-quick-policy-change", icon: "變" },
  { label: "保單借款", href: SITE_ROUTES.policyLoan, tourId: "home-quick-policy-loan", icon: "借" },
  { label: "理賠程序介紹", href: SITE_ROUTES.claims, tourId: "home-quick-claims", icon: "賠" },
  { label: "網路保險服務", href: SITE_ROUTES.online, tourId: "home-quick-online", icon: "網" },
  { label: "名詞解釋", href: SITE_ROUTES.glossary, tourId: "home-quick-glossary", icon: "詞" },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-deep via-brand-dark to-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className="text-sm tracking-widest text-white/80">保戶服務</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight md:text-5xl">
            保單大小事
            <br />
            一站查詢辦理
          </h1>
          <p className="mt-4 max-w-xl text-white/90">
            保單變更、借款、理賠申請與網路保險服務，相關說明與表單都在保戶服務專區。
          </p>
          <Link
            href={SITE_ROUTES.services}
            data-tour-id="home-hero-services"
            className="mt-6 inline-block rounded-full bg-white px-6 py-2 font-medium text-brand-deep hover:bg-brand-light"
          >
            前往保戶服務
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <h2 className="text-xl font-bold text-ink">快速服務</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                data-tour-id={link.tourId}
                className="flex h-full flex-col items-center gap-2 rounded-lg border border-neutral-200 p-4 text-center hover:border-brand hover:shadow-sm"
              >
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand"
                >
                  {link.icon}
                </span>
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">需要協助嗎？</h2>
            <p className="mt-1 text-sm text-muted">
              免付費服務／申訴專線 {seed.contacts.hotline}
            </p>
          </div>
          <LineFaqDialog className="self-start rounded-full border border-brand px-6 py-2 text-brand hover:bg-brand hover:text-white md:self-auto" />
        </div>
      </section>
    </>
  );
}
