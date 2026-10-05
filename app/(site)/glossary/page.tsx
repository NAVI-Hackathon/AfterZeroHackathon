import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/site/PageHeader";
import { SITE_ROUTES } from "@/components/site/routes";

export const metadata: Metadata = { title: "名詞解釋" };

/**
 * 暫時內容：官網「秒懂保險專有名詞」子站尚未爬取（見 seed data_gaps）。
 * 定義取自保險法條文與本站各服務頁已有的資料，待爬蟲資料進來後整批替換。
 */
const TERMS: { slug: string; term: string; definition: string; related?: { label: string; href: string } }[] = [
  {
    slug: "policyholder",
    term: "要保人",
    definition: "對保險標的具有保險利益，向保險公司申請訂立保險契約，並負有交付保險費義務的人（保險法第3條）。",
    related: { label: "要保人變更", href: `${SITE_ROUTES.policyChange}#change-policyholder` },
  },
  {
    slug: "insured",
    term: "被保險人",
    definition: "保險事故發生時遭受損害、享有賠償請求權的人；人身保險中是以其生命或身體為保險標的的人。要保人也可以同時是被保險人（保險法第4條）。",
    related: { label: "被保險人資料變更", href: `${SITE_ROUTES.policyChange}#change-insured-id` },
  },
  {
    slug: "beneficiary",
    term: "受益人",
    definition: "由被保險人或要保人約定，享有保險金請求權的人；要保人或被保險人都可以是受益人（保險法第5條）。",
    related: { label: "受益人變更", href: `${SITE_ROUTES.policyChange}#change-beneficiary` },
  },
  {
    slug: "insurable-interest",
    term: "保險利益",
    definition: "要保人對被保險人須具備的利害關係，例如本人或家屬、生活費或教育費所仰給之人、債務人、為本人管理財產或利益之人（保險法第16條）。",
  },
  {
    slug: "policy-reserve",
    term: "保單價值準備金",
    definition: "保險公司依保險契約為保單提存的準備金。保單借款的本息若超過保單價值準備金，契約效力會停止。",
    related: { label: "保單借款", href: SITE_ROUTES.policyLoan },
  },
  {
    slug: "grace-period",
    term: "寬限期",
    definition: "保險費到期未繳時，契約仍維持有效的緩衝期間。寬限期內發生保險事故，會從理賠金中扣除應繳保費後給付。",
  },
  {
    slug: "contact-info-chain",
    term: "保全聯盟鏈",
    definition: "透過巴黎線上 My Cardif 一次通知多家保險公司變更通訊地址、電子郵件、行動電話或住家電話的服務。",
    related: { label: "保全聯盟鏈", href: `${SITE_ROUTES.policyChange}#contact-info-chain` },
  },
  {
    slug: "claim-union-chain",
    term: "理賠聯盟鏈",
    definition: "被保險人本人在線上拍照上傳理賠文件，一次向多家保險公司申請理賠的服務。",
    related: { label: "理賠聯盟鏈", href: `${SITE_ROUTES.claims}#claim-union-chain` },
  },
  {
    slug: "claim-hospital-upload",
    term: "保險理賠醫起通",
    definition: "由合作醫療院所直接將診斷書等理賠文件上傳給保險公司的服務，紙本無須寄回。",
    related: { label: "保險理賠醫起通", href: `${SITE_ROUTES.claims}#claim-hospital-upload` },
  },
];

export default function GlossaryPage() {
  return (
    <>
      <PageHeader title="秒懂保險專有名詞" crumbs={[{ label: "名詞解釋" }]} />
      <PageBody>
        <p className="mb-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          示意內容：本頁名詞尚未取自官網名詞解釋子站，定義參考保險法條文與本站服務說明。
        </p>
        <dl className="divide-y divide-neutral-200 border-t-2 border-brand">
          {TERMS.map((item) => (
            <div key={item.slug} id={item.slug} data-tour-id={`glossary-term-${item.slug}`} className="py-4">
              <dt className="text-lg font-bold text-brand-deep">{item.term}</dt>
              <dd className="mt-1 text-[15px] leading-relaxed">
                {item.definition}
                {item.related && (
                  <Link href={item.related.href} className="ml-2 text-sm text-brand underline-offset-2 hover:underline">
                    相關服務：{item.related.label} ›
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </PageBody>
    </>
  );
}
