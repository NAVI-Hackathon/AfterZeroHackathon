/**
 * 模擬官網路由，以及真實官網網址 → 模擬站路徑的對照。
 * 站內連結一律指向這裡的路徑；沒有對應頁面的官網網址回傳 null（不連出去）。
 */
export const SITE_ROUTES = {
  home: "/",
  services: "/services",
  forms: "/services/forms",
  policyChange: "/services/policy-change",
  policyLoan: "/services/policy-loan",
  claims: "/services/claims",
  online: "/services/online",
  glossary: "/glossary",
} as const;

const OFFICIAL_TO_SITE: Record<string, string> = {
  "https://life.cardif.com.tw/zh/a3": SITE_ROUTES.services,
  "https://life.cardif.com.tw/zh/a311": SITE_ROUTES.forms,
  "https://life.cardif.com.tw/zh/a312": SITE_ROUTES.policyChange,
  "https://life.cardif.com.tw/zh/a313": SITE_ROUTES.policyLoan,
  "https://life.cardif.com.tw/zh/a314": SITE_ROUTES.claims,
  "https://life.cardif.com.tw/zh/f8": SITE_ROUTES.online,
  "https://life.cardif.com.tw/insurancedictionary": SITE_ROUTES.glossary,
};

export function toSitePath(officialUrl: string): string | null {
  return OFFICIAL_TO_SITE[officialUrl] ?? null;
}

/** 顯示用的官網頁面代號，例：https://life.cardif.com.tw/zh/a312 → life.cardif.com.tw/zh/a312 */
export function displayOfficialUrl(officialUrl: string): string {
  return officialUrl.replace(/^https?:\/\//, "");
}
