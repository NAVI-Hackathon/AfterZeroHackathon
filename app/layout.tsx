import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "法國巴黎人壽（模擬網站）",
    template: "%s｜法國巴黎人壽（模擬網站）",
  },
  description: "InsurHack 2026 AfterZero 隊伍作品：模擬網站，非官方",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
