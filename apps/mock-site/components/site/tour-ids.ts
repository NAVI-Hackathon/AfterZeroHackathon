/**
 * data-tour-id 命名規則（kebab-case）。導覽腳本 data/tours.json 的 target 用這些 id。
 *
 * - 分頁標籤按鈕：tab-<分頁id>          例：tab-change-beneficiary
 * - 分頁內容區塊：panel-<分頁id>        例：panel-change-beneficiary
 * - 服務說明區塊：service-<服務id>      例：service-change-beneficiary
 * - 表單列：      form-<表單id>         例：form-beneficiary-change
 * - 表單版本列：  form-<表單id>-<保單類型> 例：form-contract-change-investment
 */
import type { PolicyType } from "@/lib/contracts/response";

/** seed 的 id（底線、點）轉 kebab-case：change_beneficiary → change-beneficiary */
export function toKebab(id: string): string {
  return id.replace(/[_.\s]+/g, "-").toLowerCase();
}

export const tabTourId = (tabId: string) => `tab-${tabId}`;
export const panelTourId = (tabId: string) => `panel-${tabId}`;
export const serviceTourId = (serviceId: string) => `service-${toKebab(serviceId)}`;

/** form_beneficiary_change → form-beneficiary-change；claim_1.1.1 → form-claim-1-1-1 */
export function formTourId(formId: string, policyType?: PolicyType): string {
  const base = formId.startsWith("form_") ? toKebab(formId) : `form-${toKebab(formId)}`;
  return policyType ? `${base}-${policyType}` : base;
}
