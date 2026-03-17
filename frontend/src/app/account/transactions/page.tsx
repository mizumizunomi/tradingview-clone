"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Download, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  method: string;
  amount: number;
  status: string;
  description: string | null;
  reference: string | null;
  note: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

const PAGE_SIZE = 20;

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  DEPOSIT: { bg: "#26a69a22", text: "#26a69a" },
  WITHDRAWAL: { bg: "#ef535022", text: "#ef5350" },
  TRADE_FEE: { bg: "#f59e0b22", text: "#f59e0b" },
  ADMIN_ADJUSTMENT: { bg: "#2962ff22", text: "#2962ff" },
  SUBSCRIPTION_FEE: { bg: "#a78bfa22", text: "#a78bfa" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: "#26a69a22", text: "#26a69a" },
  PENDING: { bg: "#f59e0b22", text: "#f59e0b" },
  FAILED: { bg: "#ef535022", text: "#ef5350" },
};

function Badge({ value, colorMap }: { value: string; colorMap: Record<string, { bg: string; text: string }> }) {
  const colors = colorMap[value] ?? { bg: "#36354622", text: "#b2b5be" };
  return (
    <span
      className="rounded px-2 py-0.5 text-[10px] font-bold"
      style={{ background: colors.bg, color: colors.text }}
    >
      {value.replace("_", " ")}
    </span>
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const { token } = useTradingStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
      });
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);

      const res = await api.get<TransactionsResponse | Transaction[]>(
        `${endpoints.accountTransactions}?${params.toString()}`
      );

      // Handle both response shapes (filtered vs unfiltered)
      if (res.data && !Array.isArray(res.data) && "transactions" in res.data) {
        setTransactions(res.data.transactions);
        setTotal(res.data.total);
      } else if (Array.isArray(res.data)) {
        setTransactions(res.data);
        setTotal(res.data.length);
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, filterType, filterStatus]);

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    load();
  }, [token, load, router]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [filterType, filterStatus]);

  // Summary stats
  const totalDeposited = transactions
    .filter((t) => t.type === "DEPOSIT" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawn = transactions
    .filter((t) => t.type === "WITHDRAWAL" && t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0);
  const netChange = totalDeposited - totalWithdrawn;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ["Date", "Type", "Method", "Amount", "Status", "Reference", "Note"];
    const rows = transactions.map((t) => [
      new Date(t.createdAt).toISOString(),
      t.type,
      t.method,
      t.amount.toFixed(2),
      t.status,
      t.reference ?? "",
      t.note ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: "#131722", color: "#d1d4dc" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b px-6 py-4"
        style={{ borderColor: "#2a2e39", background: "#1e222d" }}
      >
        <ReceiptText className="h-5 w-5 text-[#2962ff]" />
        <h1 className="text-lg font-bold text-white">Transaction History</h1>
        <div className="ml-auto">
          <button
            onClick={exportCSV}
            disabled={transactions.length === 0}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#2a2e39] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "#363a45", color: "#b2b5be" }}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-6 space-y-5">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Deposited", value: totalDeposited, color: "#26a69a" },
            { label: "Total Withdrawn", value: totalWithdrawn, color: "#ef5350" },
            { label: "Net Change", value: netChange, color: netChange >= 0 ? "#26a69a" : "#ef5350" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border p-4"
              style={{ borderColor: "#2a2e39", background: "#1e222d" }}
            >
              <div className="text-xs mb-1" style={{ color: "#5d6673" }}>{item.label}</div>
              <div className="text-lg font-mono font-semibold" style={{ color: item.color }}>
                {item.value >= 0 ? "+" : ""}${formatPrice(item.value)}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: "#2a2e39", background: "#1e222d" }}
        >
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium" style={{ color: "#5d6673" }}>Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded border px-2 py-1 text-xs outline-none"
              style={{ background: "#2a2e39", borderColor: "#363a45", color: "#d1d4dc" }}
            >
              <option value="">All Types</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="TRADE_FEE">Fee</option>
              <option value="ADMIN_ADJUSTMENT">Adjustment</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium" style={{ color: "#5d6673" }}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded border px-2 py-1 text-xs outline-none"
              style={{ background: "#2a2e39", borderColor: "#363a45", color: "#d1d4dc" }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium" style={{ color: "#5d6673" }}>From</label>
            <input
              type="date"
              disabled
              placeholder="Start date"
              className="rounded border px-2 py-1 text-xs outline-none opacity-40 cursor-not-allowed"
              style={{ background: "#2a2e39", borderColor: "#363a45", color: "#d1d4dc" }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium" style={{ color: "#5d6673" }}>To</label>
            <input
              type="date"
              disabled
              placeholder="End date"
              className="rounded border px-2 py-1 text-xs outline-none opacity-40 cursor-not-allowed"
              style={{ background: "#2a2e39", borderColor: "#363a45", color: "#d1d4dc" }}
            />
          </div>
          <div className="ml-auto text-xs" style={{ color: "#5d6673" }}>
            {total} total record{total !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "#2a2e39", background: "#1e222d" }}
        >
          {loading ? (
            <div className="py-16 text-center text-sm" style={{ color: "#5d6673" }}>
              Loading transactions…
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <ReceiptText className="mx-auto mb-3 h-10 w-10 opacity-20" style={{ color: "#b2b5be" }} />
              <p className="text-sm" style={{ color: "#5d6673" }}>No transactions found</p>
              {(filterType || filterStatus) && (
                <button
                  onClick={() => { setFilterType(""); setFilterStatus(""); }}
                  className="mt-2 text-xs text-[#2962ff] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr
                    className="border-b text-left"
                    style={{ borderColor: "#2a2e39", color: "#5d6673" }}
                  >
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Fee</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isFee = tx.type === "TRADE_FEE" || tx.type === "SUBSCRIPTION_FEE";
                    const feeNote = tx.note?.match(/Fee: \$([0-9.]+)/)?.[1];
                    return (
                      <tr
                        key={tx.id}
                        className="border-b transition-colors hover:bg-[#2a2e39]"
                        style={{ borderColor: "#2a2e3933" }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#b2b5be" }}>
                          <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px]" style={{ color: "#5d6673" }}>
                            {new Date(tx.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge value={tx.type} colorMap={TYPE_COLORS} />
                        </td>
                        <td className="px-4 py-3" style={{ color: "#b2b5be" }}>
                          {tx.method.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span style={{ color: isFee ? "#ef5350" : tx.type === "DEPOSIT" ? "#26a69a" : "white" }}>
                            {tx.type === "DEPOSIT" ? "+" : "-"}${formatPrice(tx.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono" style={{ color: "#ef5350" }}>
                          {feeNote ? `-$${feeNote}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge value={tx.status} colorMap={STATUS_COLORS} />
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px]" style={{ color: "#5d6673" }}>
                          {tx.reference ?? tx.id.split("-")[0].toUpperCase()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#5d6673" }}>
              Page {page + 1} of {totalPages} ({total} records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#2a2e39] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "#363a45", color: "#b2b5be" }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#2a2e39] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "#363a45", color: "#b2b5be" }}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
