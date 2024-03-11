import { z } from "zod"

export type UserAttributes = z.infer<typeof userAttributesSchema>
export const userAttributesSchema = z.object({
  cognito_user_name: z.string().min(1),
  email: z.string().email(),
  email_verified: z.union([z.literal("Yes"), z.literal("No")]),
  user_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  company_name: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type UserAttributesCreateParam = z.infer<typeof userAttributesCreateSchema>
export const userAttributesCreateSchema = userAttributesSchema.partial({
  email_verified: true,
  user_id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
})
