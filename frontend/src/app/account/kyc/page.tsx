"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SideNav } from "@/components/layout/SideNav";
import { useTradingStore } from "@/store/trading.store";
import { api, endpoints } from "@/lib/api";
import { ShieldCheck, ShieldX, Clock, CheckCircle, AlertCircle, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface KycData {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "RESUBMIT";
  fullName: string;
  country: string;
  documentType: string;
  adminNote: string | null;
  submittedAt: string;
}

const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Germany","France","Spain",
  "Italy","Netherlands","Belgium","Sweden","Norway","Denmark","Finland","Switzerland",
  "Austria","Portugal","Poland","Czech Republic","Hungary","Romania","Bulgaria",
  "Croatia","Slovakia","Slovenia","Estonia","Latvia","Lithuania","Cyprus","Malta",
  "Greece","Turkey","UAE","Singapore","Hong Kong","Japan","South Korea","Brazil",
  "Mexico","Argentina","Chile","Colombia","Peru","South Africa","Nigeria","Kenya",
  "Other",
];

export default function KycPage() {
  const router = useRouter();
  const { token } = useTradingStore();
  const [kyc, setKyc] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    country: "",
    address: "",
    documentType: "PASSPORT",
    documentFront: "",
    documentBack: "",
  });
  const [uploading, setUploading] = useState<"documentFront" | "documentBack" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (
    field: "documentFront" | "documentBack",
    file: File | undefined,
  ) => {
    if (!file) return;
    setUploadError(null);
    setUploading(field);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await api.post(endpoints.kycUpload, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((f) => ({ ...f, [field]: res.data.url }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setUploadError(msg ?? "Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  };

  useEffect(() => {
    if (!token) { router.replace("/auth/login"); return; }
    api.get(endpoints.kycStatus).then((res) => {
      setKyc(res.data.kyc);
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(endpoints.kycSubmit, form);
      setKyc(res.data);
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const statusConfig = {
    PENDING: { icon: Clock, color: "#f59e0b", label: "Under Review", desc: "Your documents are being reviewed. This usually takes 1-3 business days." },
    APPROVED: { icon: CheckCircle, color: "#2ebd85", label: "Verified", desc: "Your identity has been verified. You can now make withdrawals." },
    REJECTED: { icon: ShieldX, color: "#f6465d", label: "Rejected", desc: "Your verification was rejected. Please review the admin note and resubmit." },
    RESUBMIT: { icon: AlertCircle, color: "#a78bfa", label: "Resubmit Required", desc: "Please provide new documents as requested." },
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--tv-bg)" }}>
      <SideNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
          <ShieldCheck className="h-5 w-5 text-[#2962ff]" />
          <div>
            <h1 className="text-base font-bold" style={{ color: "var(--tv-text-light)" }}>Identity Verification (KYC)</h1>
            <p className="text-xs" style={{ color: "var(--tv-muted)" }}>Required for withdrawals</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2" style={{ color: "var(--tv-muted)" }}>
                <Loader2 className="h-5 w-5 animate-spin" /> Loading...
              </div>
            ) : kyc && kyc.status !== "REJECTED" && kyc.status !== "RESUBMIT" ? (
              /* Status card */
              <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
                {(() => {
                  const cfg = statusConfig[kyc.status];
                  const Icon = cfg.icon;
                  return (
                    <>
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: cfg.color + "20" }}>
                          <Icon className="h-8 w-8" style={{ color: cfg.color }} />
                        </div>
                      </div>
                      <h2 className="text-lg font-bold mb-2" style={{ color: cfg.color }}>{cfg.label}</h2>
                      <p className="text-sm" style={{ color: "var(--tv-muted)" }}>{cfg.desc}</p>
                      {kyc.adminNote && (
                        <div className="mt-4 rounded-lg p-3 text-left"
                          style={{ background: cfg.color + "10", border: `1px solid ${cfg.color}30` }}>
                          <p className="text-xs font-semibold uppercase mb-1" style={{ color: cfg.color }}>Note from support</p>
                          <p className="text-sm" style={{ color: "var(--tv-text)" }}>{kyc.adminNote}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              /* Submission form */
              <>
                {kyc && (kyc.status === "REJECTED" || kyc.status === "RESUBMIT") && (
                  <div className="rounded-lg p-3" style={{ background: "#f6465d15", border: "1px solid #f6465d30" }}>
                    <p className="text-xs font-semibold text-[#f6465d] uppercase mb-0.5">Resubmission Required</p>
                    {kyc.adminNote && <p className="text-sm" style={{ color: "var(--tv-text)" }}>{kyc.adminNote}</p>}
                  </div>
                )}
                <div className="rounded-xl border p-5" style={{ borderColor: "var(--tv-border)", background: "var(--tv-bg2)" }}>
                  <h2 className="text-sm font-bold mb-4" style={{ color: "var(--tv-text)" }}>Submit Identity Documents</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Full Legal Name</label>
                        <input type="text" required value={form.fullName}
                          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                          placeholder="As on official document"
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                          style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Date of Birth</label>
                        <input type="date" required value={form.dateOfBirth}
                          onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                          style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Country of Residence</label>
                        <select required value={form.country}
                          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                          style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }}>
                          <option value="">Select country</option>
                          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Document Type</label>
                        <select value={form.documentType}
                          onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                          style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }}>
                          <option value="PASSPORT">Passport</option>
                          <option value="NATIONAL_ID">National ID</option>
                          <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Residential Address</label>
                      <textarea required value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="Street, City, State/Province, Postal Code"
                        rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none border resize-none"
                        style={{ background: "var(--tv-bg3)", borderColor: "var(--tv-border)", color: "var(--tv-text)" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Document Front</label>
                      <DocumentUpload
                        field="documentFront"
                        value={form.documentFront}
                        uploading={uploading === "documentFront"}
                        onSelect={(file) => handleFileUpload("documentFront", file)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--tv-muted)" }}>Document Back (optional)</label>
                      <DocumentUpload
                        field="documentBack"
                        value={form.documentBack}
                        uploading={uploading === "documentBack"}
                        onSelect={(file) => handleFileUpload("documentBack", file)}
                      />
                    </div>
                    {uploadError && (
                      <p className="text-xs" style={{ color: "#f6465d" }}>{uploadError}</p>
                    )}
                    <button type="submit" disabled={submitting || !!uploading || !form.documentFront}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
                      style={{ background: "#2962ff" }}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {submitting ? "Submitting…" : "Submit for Verification"}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentUpload({
  field,
  value,
  uploading,
  onSelect,
}: {
  field: string;
  value: string;
  uploading: boolean;
  onSelect: (file: File | undefined) => void;
}) {
  const inputId = `kyc-${field}`;
  return (
    <label
      htmlFor={inputId}
      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm border cursor-pointer transition-colors"
      style={{ background: "var(--tv-bg3)", borderColor: value ? "#0ecb81" : "var(--tv-border)", color: "var(--tv-text)" }}
    >
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => onSelect(e.target.files?.[0])}
      />
      {uploading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Uploading…</span>
        </>
      ) : value ? (
        <>
          <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#0ecb81" }} />
          <span className="truncate">Uploaded — click to replace</span>
        </>
      ) : (
        <>
          <Upload className="h-4 w-4 shrink-0" style={{ color: "var(--tv-muted)" }} />
          <span style={{ color: "var(--tv-muted)" }}>Choose a file (JPG, PNG, WebP or PDF, max 8 MB)</span>
        </>
      )}
    </label>
  );
}
