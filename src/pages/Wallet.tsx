import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { PageShell } from "../components/layout/PageShell";
import {
  ArrowLeft,
  Coins,
  Wallet as WalletIcon,
  X,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  History,
} from "lucide-react";
import {
  getWallet,
  getCoinTransactions,
  getExchanges,
  submitExchange,
} from "../services/coins";
import type { Wallet as WalletData, ExchangeStatus } from "../types/coins";
import { ApiError } from "../utils/apiError";
import type { ApiResponse } from "../types";
import { formatRelativeTime } from "../utils/format";

const statusLabel: Record<ExchangeStatus, string> = {
  pending: "Waiting for review",
  processing: "Being processed",
  completed: "Paid",
  rejected: "Rejected",
  failed: "Payment failed",
};

const statusColor: Record<ExchangeStatus, string> = {
  pending: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
  processing: "bg-azure-100 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300",
  completed: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300",
  rejected: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300",
  failed: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300",
};

const getErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === "object" && "response" in error) {
    return ApiError.fromAxiosError(
      error as AxiosError<ApiResponse>
    ).getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong.";
};

export const Wallet = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "requests">(
    "overview"
  );
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [coinsInput, setCoinsInput] = useState("");
  const [mobileMoneyInput, setMobileMoneyInput] = useState("");

  const { data: wallet, isLoading: isWalletLoading } = useQuery<WalletData>({
    queryKey: ["wallet"],
    queryFn: getWallet,
  });

  const { data: transactions, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["coin-transactions"],
    queryFn: () => getCoinTransactions({ per_page: 20 }),
    enabled: activeTab === "history",
  });

  const { data: exchanges, isLoading: isExchangesLoading } = useQuery({
    queryKey: ["coin-exchanges"],
    queryFn: () => getExchanges(),
    enabled: activeTab === "requests",
  });

  const exchangeMutation = useMutation({
    mutationFn: () => {
      if (!idempotencyKey) throw new Error("Missing idempotency key");
      return submitExchange(
        {
          coins: parseInt(coinsInput, 10),
          mobile_money_number: mobileMoneyInput,
        },
        idempotencyKey
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["coin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["coin-exchanges"] });
      setIsExchangeModalOpen(false);
      setCoinsInput("");
      setMobileMoneyInput("");
      setIdempotencyKey(null);
    },
  });

  const openExchangeModal = () => {
    setIdempotencyKey(crypto.randomUUID());
    exchangeMutation.reset();
    setIsExchangeModalOpen(true);
  };

  const closeExchangeModal = () => {
    setIsExchangeModalOpen(false);
    setIdempotencyKey(null);
  };

  const rate = wallet?.exchange.rate;
  const coinsValue = parseInt(coinsInput, 10);
  const previewLeones =
    rate && coinsValue > 0
      ? Math.floor((coinsValue * rate.leones * 100) / rate.coins) / 100
      : 0;

  const exchangeError = getErrorMessage(exchangeMutation.error);

  if (isWalletLoading || !wallet) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-500 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-lg">
            <WalletIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Vybe Coins
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Earn coins by completing paid courses, exchange them for Leones
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {[
            { id: "overview", label: "Overview", icon: Coins },
            { id: "history", label: "History", icon: History },
            { id: "requests", label: "My Requests", icon: Smartphone },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? "border-azure-500 text-azure-600 dark:text-azure-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Available
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {wallet.balance.available.toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Reserved
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {wallet.balance.reserved.toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Redeemed
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {wallet.balance.redeemed.toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Earned
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {wallet.balance.total_earned.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              {wallet.exchange.available && rate ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Current rate
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {rate.coins} Coins = {rate.currency} {rate.leones.toFixed(2)}
                  </p>
                  {wallet.exchange.min_exchange_coins && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Minimum exchange: {wallet.exchange.min_exchange_coins} Coins
                    </p>
                  )}
                  <button
                    onClick={openExchangeModal}
                    disabled={wallet.balance.available <= 0}
                    className="px-6 py-3 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                  >
                    Exchange for Leones
                  </button>
                </>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  Exchange coming soon — an admin hasn't set a rate yet.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {isHistoryLoading ? (
              <div className="p-6 animate-pulse space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            ) : transactions && transactions.data.length > 0 ? (
              transactions.data.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {tx.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(new Date(tx.created_at))}
                    </p>
                  </div>
                  <p
                    className={`font-bold ${
                      tx.direction === "credit"
                        ? "text-green-600 dark:text-green-400"
                        : tx.direction === "debit"
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {tx.available_delta > 0 ? "+" : ""}
                    {tx.available_delta}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No coin activity yet.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {isExchangesLoading ? (
              <div className="p-6 animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            ) : exchanges && exchanges.data.length > 0 ? (
              exchanges.data.map((exchange) => (
                <div key={exchange.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {exchange.coins.toLocaleString()} Coins → {exchange.currency}{" "}
                      {exchange.leone_amount.toFixed(2)}
                    </p>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[exchange.status]}`}
                    >
                      {statusLabel[exchange.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(new Date(exchange.created_at))} • sent to{" "}
                    {exchange.mobile_money_number}
                  </p>
                  {exchange.status === "completed" && exchange.payout_reference && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Paid — ref {exchange.payout_reference}
                    </p>
                  )}
                  {(exchange.status === "rejected" || exchange.status === "failed") &&
                    exchange.rejection_reason && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {exchange.rejection_reason}
                      </p>
                    )}
                  {exchange.coins_reserved && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Coins reserved until this is processed
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No exchange requests yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {isExchangeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Exchange for Leones
              </h2>
              <button
                onClick={closeExchangeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                exchangeMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Coins to exchange
                </label>
                <input
                  type="number"
                  value={coinsInput}
                  onChange={(e) => setCoinsInput(e.target.value)}
                  min={wallet.exchange.min_exchange_coins || 1}
                  max={wallet.balance.available}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                  placeholder={`${wallet.exchange.min_exchange_coins || 1} - ${wallet.balance.available}`}
                  required
                />
                {rate && coinsValue > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    You will receive {rate.currency} {previewLeones.toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mobile Money number
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={mobileMoneyInput}
                    onChange={(e) => setMobileMoneyInput(e.target.value)}
                    placeholder="+232 76 123 456"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                    required
                  />
                </div>
              </div>

              {exchangeError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {exchangeError}
                </p>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={closeExchangeModal}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={exchangeMutation.isPending}
                  className="flex-1 px-6 py-3 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                >
                  {exchangeMutation.isPending ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
};
