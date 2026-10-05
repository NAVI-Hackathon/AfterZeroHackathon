import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_ROUTES } from "@/components/site/routes";
import { formTourId, serviceTourId } from "@/components/site/tour-ids";
import { getForm, type SeedService } from "../_lib/seed";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid border-b border-neutral-200 md:grid-cols-[9rem_1fr]">
      <dt className="bg-neutral-50 px-4 py-3 text-sm font-semibold text-brand-deep md:bg-brand-light">
        {label}
      </dt>
      <dd className="px-4 py-3 text-[15px] leading-relaxed">{children}</dd>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  if (items.length === 1) return <>{items[0]}</>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** 仿官網服務說明表：辦理方式、時間、文件、注意事項、相關表單（不顯示我們自己的分析欄位） */
export function ServiceDetail({ service, children }: { service: SeedService; children?: ReactNode }) {
  const forms = service.related_forms.map(getForm);
  const tourId = serviceTourId(service.id);

  return (
    <section data-tour-id={tourId} aria-labelledby={`${tourId}-title`}>
      <h2 id={`${tourId}-title`} className="mb-3 flex flex-wrap items-center gap-2 text-xl font-bold text-ink">
        {service.name}
        {service.requires_login && (
          <span className="rounded bg-brand-deep px-2 py-0.5 text-xs font-normal text-white">需登入會員</span>
        )}
      </h2>
      <dl className="border-t-2 border-brand">
        {service.channels.length > 0 && (
          <Row label="辦理方式"><List items={service.channels} /></Row>
        )}
        {service.apply_time && <Row label="申請時間">{service.apply_time}</Row>}
        {service.effective_time && <Row label="生效時間">{service.effective_time}</Row>}
        {service.documents.length > 0 && (
          <Row label="應備文件"><List items={service.documents} /></Row>
        )}
        {service.notes.length > 0 && (
          <Row label="注意事項"><List items={service.notes} /></Row>
        )}
        {forms.length > 0 && (
          <Row label="相關表單">
            <ul className="space-y-1">
              {forms.map((form) => (
                <li key={form.id}>
                  <Link
                    href={`${SITE_ROUTES.forms}#${form.id.startsWith("claim_") ? "forms-claim" : "forms-policy"}`}
                    data-tour-id={`${tourId}-link-${formTourId(form.id)}`}
                    className="text-brand underline-offset-2 hover:underline"
                  >
                    {form.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Row>
        )}
      </dl>
      {children}
    </section>
  );
}
