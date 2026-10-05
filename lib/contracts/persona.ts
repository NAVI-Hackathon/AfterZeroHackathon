/**
 * 共用契約：身分與模擬保戶型別
 * 依 SPEC §3。實際資料放在 data/personas.json（全部虛構，畫面上要標示為範例資料）。
 * 改動需走 contract/<主題> 分支 + PR，並通知全員。
 */
import { z } from "zod";
import { PolicyTypeSchema } from "./response";

/** 三種身分，共用同一個引擎 */
export const RoleSchema = z.enum(["visitor", "policyholder", "agent"]);
export type Role = z.infer<typeof RoleSchema>;

export const ROLE_LABELS: Record<Role, string> = {
  visitor: "訪客",
  policyholder: "保戶",
  agent: "業務員",
};

/** 繳費方式 */
export const PaymentMethodSchema = z.enum(["credit_card", "bank_transfer", "other"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: "信用卡扣款",
  bank_transfer: "銀行轉帳扣款",
  other: "其他",
};

/** 模擬保單（假資料） */
export const PolicySchema = z.object({
  /** 虛構保單號碼，例：DEMO-0001 */
  policy_no: z.string(),
  product_name: z.string(),
  policy_type: PolicyTypeSchema,
  /** 險種，例：醫療險、壽險 */
  product_category: z.string(),
  payment_method: PaymentMethodSchema,
});
export type Policy = z.infer<typeof PolicySchema>;

const PersonaBase = z.object({
  id: z.string(),
  display_name: z.string(),
});

export const VisitorPersonaSchema = PersonaBase.extend({
  role: z.literal("visitor"),
});

export const PolicyholderPersonaSchema = PersonaBase.extend({
  role: z.literal("policyholder"),
  /** 是否已是 My Cardif 會員並開通線上變更（以「人」為單位） */
  online_change_enabled: z.boolean(),
  policies: z.array(PolicySchema).min(1),
});

export const AgentPersonaSchema = PersonaBase.extend({
  role: z.literal("agent"),
});

export const PersonaSchema = z.discriminatedUnion("role", [
  VisitorPersonaSchema,
  PolicyholderPersonaSchema,
  AgentPersonaSchema,
]);
export type Persona = z.infer<typeof PersonaSchema>;
export type VisitorPersona = z.infer<typeof VisitorPersonaSchema>;
export type PolicyholderPersona = z.infer<typeof PolicyholderPersonaSchema>;
export type AgentPersona = z.infer<typeof AgentPersonaSchema>;

/** data/personas.json 的檔案格式 */
export const PersonasFileSchema = z.array(PersonaSchema);
