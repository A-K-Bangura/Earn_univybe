import api from "./api";
import type { ApiResponse } from "../types";
import type {
  Wallet,
  CoinTransaction,
  CoinTransactionList,
  CoinExchange,
  ExchangeList,
  ExchangeStatus,
  SubmitExchangeResult,
  PageMeta,
} from "../types/coins";

// Everything the wallet/exchange screen needs in one call: balances, the
// live rate, the minimum, and whether exchanging is open.
export const getWallet = async (): Promise<Wallet> => {
  const response = await api.get<ApiResponse<Wallet>>("/student/coins");

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch wallet");
  }

  return response.data.data;
};

// The student's coin statement, newest first.
export const getCoinTransactions = async (params?: {
  type?: string;
  per_page?: number;
  page?: number;
}): Promise<CoinTransactionList> => {
  const query = new URLSearchParams();
  if (params?.type) query.append("type", params.type);
  if (params?.per_page) query.append("per_page", params.per_page.toString());
  if (params?.page) query.append("page", params.page.toString());

  const response = await api.get<
    ApiResponse<CoinTransaction[]> & { meta?: PageMeta }
  >(`/student/coins/transactions?${query.toString()}`);

  // This endpoint's `meta` sits at the top level of the envelope, a sibling
  // of `data` (which is the transaction array itself) — not the raw-Laravel-
  // paginator shape used by courses/feed, where pagination fields are flat
  // on `data`. Reconstruct the {data, meta} pair the caller expects.
  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(
      response.data.message || "Failed to fetch coin history"
    );
  }

  return { data: response.data.data, meta: response.data.meta };
};

// Ask to exchange coins for Leones (Mobile Money). Does not pay anyone —
// reserves the coins and queues the request for an admin. `idempotencyKey`
// must be generated once per form-open (e.g. crypto.randomUUID()) and reused
// on every retry of that same submission — required by the backend.
export const submitExchange = async (
  payload: { coins: number; mobile_money_number: string },
  idempotencyKey: string
): Promise<SubmitExchangeResult> => {
  const response = await api.post<ApiResponse<SubmitExchangeResult>>(
    "/student/coins/exchanges",
    payload,
    { headers: { "Idempotency-Key": idempotencyKey } }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to submit exchange request"
    );
  }

  return response.data.data;
};

// The student's own exchange requests and their status.
export const getExchanges = async (
  status?: ExchangeStatus
): Promise<ExchangeList> => {
  const query = new URLSearchParams();
  if (status) query.append("status", status);

  const response = await api.get<
    ApiResponse<CoinExchange[]> & { meta?: PageMeta }
  >(`/student/coins/exchanges?${query.toString()}`);

  // Same {data, meta}-as-siblings shape as getCoinTransactions above.
  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch exchanges");
  }

  return { data: response.data.data, meta: response.data.meta };
};

export const getExchange = async (id: string): Promise<CoinExchange> => {
  const response = await api.get<ApiResponse<{ exchange: CoinExchange }>>(
    `/student/coins/exchanges/${id}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch exchange");
  }

  return response.data.data.exchange;
};
