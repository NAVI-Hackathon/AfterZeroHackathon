/**
 * 共用契約：助手回應格式（前後端唯一共用來源）
 * 依 SPEC §4 F3、§5「回應格式」。改動需走 contract/<主題> 分支 + PR，並通知全員。
 *
 * 設計約定：
 * - 「可以沒有」的欄位一律用 `.nullable()`（鍵必須存在、值可為 null），不用 `.optional()`。
 *   原因：OpenAI Structured Outputs 的 strict 模式要求所有欄位都列在 required，
 *   optional 欄位會導致 schema 被拒。前端判斷時用 `x !== null`。
 * - 每張卡片的 `sources` 至少一筆（產品護欄：每張卡片必附來源）。
 * - `type` 只能是下列五種，LLM 不可輸出未定義的卡片類型。
 */
import { z } from "zod";

/* ---------- 共用片段 ---------- */

/** 擷取日期，格式 YYYY-MM-DD（例：2026-10-06） */
export const RetrievedAtSchema = z.iso.date();

/** 資料來源：官網頁面網址 + 擷取日期。只有這個網址可以用新分頁開真實官網 */
export const SourceSchema = z.object({
  url: z.url(),
  title: z.string().nullable(),
  retrieved_at: RetrievedAtSchema,
});
export type Source = z.infer<typeof SourceSchema>;

/** 保單類型：保障型、投資型、分紅型（同名表單依此拆版本） */
export const PolicyTypeSchema = z.enum(["protection", "investment", "participating"]);
export type PolicyType = z.infer<typeof PolicyTypeSchema>;

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  protection: "保障型",
  investment: "投資型",
  participating: "分紅型",
};

/** 辦理管道類型 */
export const ChannelTypeSchema = z.enum(["online", "paper", "phone", "other"]);
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

const CardSources = z.array(SourceSchema).min(1);

/* ---------- 五種卡片 ---------- */

/** 服務流程：步驟、應備文件、申請時間、生效時間、注意事項、各管道 */
export const ServiceFlowCardSchema = z.object({
  type: z.literal("service_flow"),
  service_id: z.string(),
  title: z.string(),
  steps: z.array(z.string()),
  documents: z.array(z.string()),
  apply_time: z.string().nullable(),
  effective_time: z.string().nullable(),
  notes: z.array(z.string()),
  channels: z.array(
    z.object({
      type: ChannelTypeSchema,
      name: z.string(),
      description: z.string().nullable(),
      /** 有值時前端顯示「帶我去」，對應 data/tours.json 的 tour_id */
      tour_id: z.string().nullable(),
    }),
  ),
  sources: CardSources,
});
export type ServiceFlowCard = z.infer<typeof ServiceFlowCardSchema>;

/** 表單：名稱、適用保單類型、下載或前往連結 */
export const FormCardSchema = z.object({
  type: z.literal("form"),
  form_id: z.string(),
  title: z.string(),
  /** 空陣列 = 不分保單類型都適用 */
  policy_types: z.array(PolicyTypeSchema),
  /** 檔案下載網址（PDF 等）；沒有直接檔案時為 null */
  download_url: z.url().nullable(),
  /** 模擬網站站內路徑（例：/forms），前往表單所在頁面 */
  page_path: z.string().nullable(),
  note: z.string().nullable(),
  tour_id: z.string().nullable(),
  sources: CardSources,
});
export type FormCard = z.infer<typeof FormCardSchema>;

/** 功能入口平台 */
export const EntryPlatformSchema = z.enum(["site", "my_cardif", "app", "line"]);
export type EntryPlatform = z.infer<typeof EntryPlatformSchema>;

/** 功能入口（例：My Cardif 某功能），附「帶我去」按鈕 */
export const EntryPointCardSchema = z.object({
  type: z.literal("entry_point"),
  title: z.string(),
  description: z.string(),
  platform: EntryPlatformSchema,
  requires_login: z.boolean(),
  /** 模擬網站站內路徑 */
  page_path: z.string().nullable(),
  tour_id: z.string().nullable(),
  sources: CardSources,
});
export type EntryPointCard = z.infer<typeof EntryPointCardSchema>;

/** 問答 */
export const FaqCardSchema = z.object({
  type: z.literal("faq"),
  question: z.string(),
  answer: z.string(),
  sources: CardSources,
});
export type FaqCard = z.infer<typeof FaqCardSchema>;

/** 轉客服（電話、時間） */
export const HandoffCardSchema = z.object({
  type: z.literal("handoff"),
  reason: z.string(),
  phone: z.string(),
  service_hours: z.string(),
  note: z.string().nullable(),
  sources: CardSources,
});
export type HandoffCard = z.infer<typeof HandoffCardSchema>;

export const CardSchema = z.discriminatedUnion("type", [
  ServiceFlowCardSchema,
  FormCardSchema,
  EntryPointCardSchema,
  FaqCardSchema,
  HandoffCardSchema,
]);
export type Card = z.infer<typeof CardSchema>;
export type CardType = Card["type"];

/* ---------- 追問 ---------- */

/** 條件追問（F4）。options 非空時前端渲染成按鈕 */
export const FollowupQuestionSchema = z.object({
  question: z.string(),
  options: z.array(
    z.object({
      label: z.string(),
      /** 使用者點選後送回後端的值 */
      value: z.string(),
    }),
  ),
});
export type FollowupQuestion = z.infer<typeof FollowupQuestionSchema>;

/* ---------- 回應 ---------- */

export const ResponseSchema = z.object({
  text: z.string(),
  cards: z.array(CardSchema),
  followup_question: FollowupQuestionSchema.nullable(),
  /** 整則回應引用的來源（卡片自身的 sources 另計） */
  sources: z.array(SourceSchema),
});
export type AssistantResponse = z.infer<typeof ResponseSchema>;
