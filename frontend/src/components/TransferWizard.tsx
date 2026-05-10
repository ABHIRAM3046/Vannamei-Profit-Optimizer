"use client";
import { useState } from "react";
import { pondsAPI, type Pond } from "@/lib/api";
import { useTranslation } from "@/lib/i18n/context";

interface Props {
  sourcePond: Pond;
  onSuccess: () => void;
  onCancel: () => void;
  allPonds: Pond[];
}

export default function TransferWizard({ sourcePond, onSuccess, onCancel, allPonds }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [transferCount, setTransferCount] = useState("");
  const [targetPondId, setTargetPondId] = useState("");
  const [newPondName, setNewPondName] = useState("");
  const [loading, setLoading] = useState(false);

  const availableDestinations = allPonds.filter(p => p.id !== sourcePond.id);

  const maxTransfer = sourcePond.latest_metrics?.surviving_count || sourcePond.pl_stocked;

  const handleNext = () => {
    if (step === 1 && parseInt(transferCount) > 0 && parseInt(transferCount) <= maxTransfer) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!targetPondId && !newPondName) return;
    setLoading(true);
    try {
      await pondsAPI.transfer({
        source_pond_id: sourcePond.id,
        target_pond_id: targetPondId === "new" ? undefined : targetPondId,
        target_pond_name: targetPondId === "new" ? newPondName : undefined,
        pl_count: parseInt(transferCount)
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Transfer failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} />
      <div className="glass-card animate-fade-in" style={{ position: "relative", padding: "2rem", maxWidth: 500, width: "100%" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>🔄 {t("transfer.title") || "Transfer PLs"}</h2>
        
        {step === 1 && (
          <div className="animate-fade-in">
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {t("transfer.step1_desc") || `How many shrimp would you like to transfer from ${sourcePond.name}? (Max: ${maxTransfer.toLocaleString()})`}
            </p>
            <div style={{ marginBottom: "2rem" }}>
              <input 
                type="number" 
                className="form-input" 
                value={transferCount} 
                onChange={e => setTransferCount(e.target.value)} 
                placeholder="e.g. 50000"
                max={maxTransfer}
              />
            </div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button onClick={onCancel} className="btn" style={{ background: "transparent", border: "1px solid var(--border-subtle)" }}>Cancel</button>
              <button onClick={handleNext} className="btn btn-primary" disabled={!transferCount || parseInt(transferCount) <= 0 || parseInt(transferCount) > maxTransfer}>Next</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
             <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {t("transfer.step2_desc") || `Where should these ${parseInt(transferCount).toLocaleString()} shrimp go?`}
            </p>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <select className="form-input" value={targetPondId} onChange={e => setTargetPondId(e.target.value)}>
                <option value="">-- Select Destination --</option>
                {availableDestinations.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="new">+ Create New Pond</option>
              </select>
            </div>

            {targetPondId === "new" && (
              <div style={{ marginBottom: "1.5rem" }} className="animate-fade-in">
                <label className="form-label">New Pond Name</label>
                <input type="text" className="form-input" value={newPondName} onChange={e => setNewPondName(e.target.value)} placeholder="e.g. Grow-out Pond 1" />
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setStep(1)} className="btn" style={{ background: "transparent", border: "1px solid var(--border-subtle)" }}>Back</button>
              <button onClick={handleSubmit} className="btn btn-primary" disabled={loading || (!targetPondId && !newPondName)}>
                {loading ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
