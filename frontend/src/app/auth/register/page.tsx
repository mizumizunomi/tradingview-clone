"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { api, endpoints } from "@/lib/api";

interface FieldErrors {
  firstName?: string;
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

const PW_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

function pwStrength(pw: string): { score: number; label: string; color: string } {
  const passed = PW_RULES.filter((r) => r.test(pw)).length;
  if (pw.length === 0) return { score: 0, label: "", color: "#363a45" };
  if (passed === 1) return { score: 1, label: "Weak", color: "#ef5350" };
  if (passed === 2) return { score: 2, label: "Fair", color: "#f59e0b" };
  return { score: 3, label: "Strong", color: "#26a69a" };
}

function validate(form: {
  firstName: string; email: string; username: string;
  password: string; confirmPassword: string;
}): FieldErrors {
  const errs: FieldErrors = {};
  if (!form.firstName.trim()) errs.firstName = "First name is required";
  if (!form.email.trim()) errs.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email format";
  if (!form.username.trim()) errs.username = "Username is required";
  else if (form.username.length < 3) errs.username = "Username must be at least 3 characters";
  if (!form.password) errs.password = "Password is required";
  else if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
  else if (!/[A-Z]/.test(form.password)) errs.password = "Must contain at least one uppercase letter";
  else if (!/[0-9]/.test(form.password)) errs.password = "Must contain at least one number";
  if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
  else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
  return errs;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", username: "", password: "", confirmPassword: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = pwStrength(form.password);
  const fieldErrs = validate(form);
  const isValid = Object.keys(fieldErrs).length === 0;

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));
  const err = (field: keyof FieldErrors) => touched[field] ? fieldErrs[field] : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(
      ["firstName", "email", "username", "password", "confirmPassword"].map((k) => [k, true])
    );
    setTouched(allTouched);
    if (!isValid) return;
    setLoading(true);
    setApiError("");
    try {
      await api.post(endpoints.register, {
        email: form.email,
        username: form.username,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName || undefined,
      });
      // Don't auto-login — redirect to login with success flag
      router.push("/auth/login?registered=true");
    } catch (ex: any) {
      const msg = ex.response?.data?.message;
      setApiError(Array.isArray(msg) ? msg[0] : (msg || "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field: keyof FieldErrors) =>
    `w-full rounded-lg border bg-[#2a2e39] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#5d6673] focus:border-[#2962ff] ${err(field) ? "border-[#ef5350]" : "border-[#363a45]"}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131722] py-8">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#b2b5be 1px, transparent 1px), linear-gradient(90deg, #b2b5be 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm px-4">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2962ff] shadow-lg shadow-[#2962ff44]">
              <BarChart2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-[#5d6673]">
            Deposit $250 after signing up to start trading
          </p>
        </div>

        <div className="rounded-xl border border-[#363a45] bg-[#1e222d] p-6 shadow-2xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {/* Name row */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">First name <span className="text-[#ef5350]">*</span></label>
                <input
                  placeholder="John"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  onBlur={() => touch("firstName")}
                  className={inputCls("firstName")}
                />
                {err("firstName") && <p className="mt-1 text-xs text-[#ef5350]">{err("firstName")}</p>}
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Last name</label>
                <input
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full rounded-lg border border-[#363a45] bg-[#2a2e39] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#5d6673] focus:border-[#2962ff]"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Email address <span className="text-[#ef5350]">*</span></label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setApiError(""); }}
                onBlur={() => touch("email")}
                className={inputCls("email")}
                autoComplete="email"
              />
              {err("email") && <p className="mt-1 text-xs text-[#ef5350]">{err("email")}</p>}
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Username <span className="text-[#ef5350]">*</span></label>
              <input
                placeholder="trader123"
                value={form.username}
                onChange={(e) => { setForm({ ...form, username: e.target.value }); setApiError(""); }}
                onBlur={() => touch("username")}
                className={inputCls("username")}
                autoComplete="username"
              />
              {err("username") && <p className="mt-1 text-xs text-[#ef5350]">{err("username")}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Password <span className="text-[#ef5350]">*</span></label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onBlur={() => touch("password")}
                  className={`${inputCls("password")} pr-10`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d6673] hover:text-[#b2b5be]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{ background: i <= strength.score ? strength.color : "#2a2e39" }}
                      />
                    ))}
                    <span className="text-xs ml-1" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {PW_RULES.map((r) => {
                      const ok = r.test(form.password);
                      return (
                        <div key={r.label} className="flex items-center gap-1.5">
                          {ok
                            ? <Check className="h-3 w-3 text-[#26a69a]" />
                            : <X className="h-3 w-3 text-[#5d6673]" />}
                          <span className="text-[11px]" style={{ color: ok ? "#26a69a" : "#5d6673" }}>{r.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {err("password") && !form.password && (
                <p className="mt-1 text-xs text-[#ef5350]">{err("password")}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#b2b5be]">Confirm password <span className="text-[#ef5350]">*</span></label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  onBlur={() => touch("confirmPassword")}
                  className={`${inputCls("confirmPassword")} pr-10`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d6673] hover:text-[#b2b5be]">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {err("confirmPassword") && <p className="mt-1 text-xs text-[#ef5350]">{err("confirmPassword")}</p>}
            </div>

            {/* API error */}
            {apiError && (
              <div className="rounded-lg border border-[#ef535040] bg-[#ef535015] px-3 py-2 text-xs text-[#ef5350]">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2962ff] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2962ff33] transition-all hover:bg-[#3d6fff] disabled:opacity-60 mt-1"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/auth/login")}
            className="text-xs text-[#5d6673] hover:text-[#2962ff] transition-colors"
          >
            Already have an account? <span className="text-[#2962ff]">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  );
}
