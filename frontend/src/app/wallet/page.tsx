"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Landmark, Bitcoin } from "lucide-react";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const METHODS = [
  { id: "WIRE_TRANSFER", label: "Wire Transfer", icon: Landmark, desc: "Bank-to-bank transfer" },
  { id: "DEBIT_CARD", label: "Debit Card", icon: CreditCard, desc: "Instant deposit" },
  { id: "CRYPTO", label: "Crypto", icon: Bitcoin, desc: "BTC, ETH, USDT" },
];

export default function WalletPage() {
  const router = useRouter();
  const { token, wallet, setWallet } = useTradingStore();
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [method, setMethod] = useState("DEBIT_CARD");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    const load = async () => {
      try {
        const [walletRes, txRes] = await Promise.all([
          api.get(endpoints.wallet),
          api.get(endpoints.transactions),
        ]);
        setWallet(walletRes.data);
        setTransactions(txRes.data);
      } catch {}
    };
    load();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setMessage({ type: "error", text: "Enter a valid amount" });
    setLoading(true);
    setMessage(null);
    try {
      const url = tab === "deposit" ? endpoints.deposit : endpoints.withdraw;
      const res = await api.post(url, { amount: amt, method });
      setWallet(res.data);
      setAmount("");
      setMessage({ type: "success", text: `${tab === "deposit" ? "Deposit" : "Withdrawal"} of $${formatPrice(amt)} successful!` });
      const txRes = await api.get(endpoints.transactions);
      setTransactions(txRes.data);
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Transaction failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131722] text-[#d1d4dc]">
      {/* Header */}
      <div className="border-b border-[#363a45] bg-[#1e222d] px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/trade")} className="text-[#b2b5be] hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-white">Wallet</h1>
      </div>

      <div className="mx-auto max-w-4xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance card */}
        {wallet && (
          <div className="rounded-lg border border-[#363a45] bg-[#1e222d] p-5">
            <div className="text-sm text-[#b2b5be] mb-4 font-semibold uppercase">Account Overview</div>
            <div className="space-y-3">
              {[
                { label: "Balance", value: wallet.balance },
                { label: "Equity", value: wallet.equity },
                { label: "Free Margin", value: wallet.freeMargin },
                { label: "Used Margin", value: wallet.margin },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-[#b2b5be] text-sm">{item.label}</span>
                  <span className="text-white font-mono font-medium">${formatPrice(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deposit/Withdraw form */}
        <div className="rounded-lg border border-[#363a45] bg-[#1e222d] p-5">
          <div className="flex gap-0 border-b border-[#363a45] mb-4">
            <button onClick={() => setTab("deposit")} className={`px-4 py-2 text-sm font-medium ${tab === "deposit" ? "border-b-2 border-[#2962ff] text-white" : "text-[#b2b5be]"}`}>Deposit</button>
            <button onClick={() => setTab("withdraw")} className={`px-4 py-2 text-sm font-medium ${tab === "withdraw" ? "border-b-2 border-[#2962ff] text-white" : "text-[#b2b5be]"}`}>Withdraw</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs uppercase text-[#5d6673]">Payment Method</label>
              <div className="space-y-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex w-full items-center gap-3 rounded border p-3 text-left transition-colors ${method === m.id ? "border-[#2962ff] bg-[#2962ff11]" : "border-[#363a45] hover:border-[#434651]"}`}
                  >
                    <m.icon className="h-4 w-4 text-[#b2b5be]" />
                    <div>
                      <div className="text-sm text-white">{m.label}</div>
                      <div className="text-xs text-[#5d6673]">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase text-[#5d6673]">Amount (USD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                step="0.01"
                className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-3 py-2 text-white outline-none focus:border-[#2962ff]"
              />
            </div>

            <div className="flex gap-2">
              {[100, 500, 1000, 5000].map((preset) => (
                <button key={preset} type="button" onClick={() => setAmount(preset.toString())}
                  className="flex-1 rounded border border-[#363a45] bg-[#2a2e39] py-1.5 text-xs text-[#b2b5be] hover:border-[#2962ff] hover:text-white">
                  ${preset}
                </button>
              ))}
            </div>

            {message && (
              <div className={`rounded px-3 py-2 text-sm ${message.type === "success" ? "bg-[#26a69a22] text-[#26a69a]" : "bg-[#ef535022] text-[#ef5350]"}`}>
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded bg-[#2962ff] py-2.5 text-sm font-bold text-white hover:bg-[#1e4dd8] disabled:opacity-50">
              {loading ? "Processing..." : tab === "deposit" ? "Deposit Funds" : "Withdraw Funds"}
            </button>
          </form>
        </div>

        {/* Transaction history */}
        <div className="md:col-span-2 rounded-lg border border-[#363a45] bg-[#1e222d] p-5">
          <div className="text-sm font-semibold uppercase text-[#b2b5be] mb-4">Transaction History</div>
          {transactions.length === 0 ? (
            <div className="text-center text-sm text-[#5d6673] py-4">No transactions yet</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#5d6673] border-b border-[#363a45]">
                  <th className="pb-2 text-left font-medium">Type</th>
                  <th className="pb-2 text-left font-medium">Method</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-[#1e222d]">
                    <td className="py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tx.type === "DEPOSIT" ? "bg-[#26a69a22] text-[#26a69a]" : "bg-[#ef535022] text-[#ef5350]"}`}>{tx.type}</span>
                    </td>
                    <td className="py-2 text-[#b2b5be]">{tx.method.replace("_", " ")}</td>
                    <td className="py-2 text-right font-mono text-white">${formatPrice(tx.amount)}</td>
                    <td className="py-2 text-right">
                      <span className="text-[#26a69a]">{tx.status}</span>
                    </td>
                    <td className="py-2 text-right text-[#5d6673]">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
