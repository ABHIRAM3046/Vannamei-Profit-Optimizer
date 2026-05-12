"use client";
import { useState } from "react";
import { iotAPI } from "@/lib/api";

export default function IoTSetupCard({ pondId }: { pondId: string }) {
  const [macAddress, setMacAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!macAddress) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await iotAPI.registerDevice({
        device_id: macAddress,
        pond_id: pondId,
        name: `ESP32 Sensor (${macAddress.substring(0, 4)})`,
      });
      setSuccess(true);
      setMacAddress("");
    } catch (err: any) {
      setError(err.message || "Failed to register device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>📡 IoT Device Setup</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Link an ESP board or 4G sensor to this pond by entering its MAC Address or Device ID.
      </p>

      {success && (
        <div style={{ padding: "0.75rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--teal)", borderRadius: "8px", color: "var(--teal)", marginBottom: "1rem" }}>
          Device linked successfully! It will now push live telemetry to this pond.
        </div>
      )}

      {error && (
        <div style={{ padding: "0.75rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--red)", borderRadius: "8px", color: "var(--red)", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          className="form-input"
          style={{ flex: 1 }}
          placeholder="e.g. 00:1B:44:11:3A:B7"
          value={macAddress}
          onChange={(e) => setMacAddress(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Linking..." : "Link Device"}
        </button>
      </form>
    </div>
  );
}
