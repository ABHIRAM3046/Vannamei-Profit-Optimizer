"use client";
import { useState } from "react";
import { authAPI } from "@/lib/api";

import { useTranslation } from "@/lib/i18n/context";

export default function AuthScreen({ onLogin }: { onLogin: (userId: string) => void }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  async function handleRequestOTP() {
    setLoading(true); setError("");
    try {
      const res = await authAPI.requestOTP(phone);
      setDevOtp(res.dev_otp);
      setStep("otp");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleVerifyOTP() {
    setLoading(true); setError("");
    try {
      const res = await authAPI.verifyOTP(phone, otp);
      onLogin(res.user.id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", position: "relative", zIndex: 1 }}>
      <div className="glass-card animate-fade-in" style={{ padding: "2.5rem", maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🦐</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(135deg, #00d4aa, #0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t("auth.title")}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            {t("auth.subtitle")}
          </p>
        </div>

        {step === "phone" ? (
          <div>
            <label className="form-label">{t("auth.phone")}</label>
            <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+919876543210" style={{ marginBottom: "1rem" }} />
            <button className="btn-primary" style={{ width: "100%" }} onClick={handleRequestOTP} disabled={loading || phone.length < 10}>
              {loading ? t("auth.sending") : t("auth.getOtp")}
            </button>
          </div>
        ) : (
          <div>
            <label className="form-label">{t("auth.enterOtp")}</label>
            {devOtp && (
              <div style={{ background: "var(--teal-dim)", padding: "0.5rem 0.75rem", borderRadius: 8, marginBottom: "0.75rem", fontSize: "0.8rem", color: "var(--teal)" }}>
                {t("auth.devOtp")}: <strong>{devOtp}</strong>
              </div>
            )}
            <input className="form-input" type="text" value={otp} onChange={e => setOtp(e.target.value)}
              placeholder="123456" maxLength={6} style={{ marginBottom: "1rem", letterSpacing: "0.3em", textAlign: "center", fontSize: "1.25rem" }} />
            <button className="btn-primary" style={{ width: "100%" }} onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}>
              {loading ? t("auth.verifying") : t("auth.login")}
            </button>
            <button onClick={() => setStep("phone")} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginTop: "0.75rem", width: "100%", fontSize: "0.85rem" }}>
              {t("auth.changeNumber")}
            </button>
          </div>
        )}

        {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginTop: "0.75rem", textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}
