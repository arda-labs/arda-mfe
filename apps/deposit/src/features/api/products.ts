import type { DepositSavingsProductInput } from "@workspace/api/generated/deposit-v1"
import type { SavingsProduct, WireBody } from "./types"
import { postCanonical } from "@workspace/api"

export type ProductUpsertInput = WireBody<
  DepositSavingsProductInput,
  "code" | "name" | "term_months" | "interest_rate"
>

export const productApi = {
  upsert: (body: ProductUpsertInput) =>
    postCanonical<SavingsProduct>("/api/deposit/products", body),
}
