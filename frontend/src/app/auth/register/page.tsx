"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, endpoints } from "@/lib/api";
import { useTradingStore } from "@/store/trading.store";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken } = useTradingStore();
  const [form, setForm] = useState({ email: "", username: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post(endpoints.register, form);
      setToken(res.data.token);
      setUser(res.data.user);
      router.push("/trade");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#131722]">
      <div className="w-96 rounded-lg border border-[#363a45] bg-[#1e222d] p-8">
        <div className="mb-6 text-center">
          <div className="mb-2 text-2xl font-bold text-white">Create Account</div>
          <div className="text-[#b2b5be]">Start with $10,000 demo balance</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input placeholder="First Name" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})}
              className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-3 py-2 text-white outline-none focus:border-[#2962ff]" />
            <input placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})}
              className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-3 py-2 text-white outline-none focus:border-[#2962ff]" />
          </div>
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required
            className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-3 py-2 text-white outline-none focus:border-[#2962ff]" />
          <input placeholder="Username" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required
            className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-3 py-2 text-white outline-none focus:border-[#2962ff]" />
          <input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required
            className="w-full rounded border border-[#363a45] bg-[#2a2e39] px-3 py-2 text-white outline-none focus:border-[#2962ff]" />

          {error && <div className="text-sm text-[#ef5350]">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full rounded bg-[#2962ff] py-2 font-medium text-white hover:bg-[#1e4dd8] disabled:opacity-50">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="mt-3 text-center">
          <button onClick={() => router.push("/auth/login")} className="text-sm text-[#2962ff] hover:underline">
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
