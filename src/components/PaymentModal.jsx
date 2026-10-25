import { useState, useEffect } from "react";
import { api } from "../services/api";
import { inr } from "../services/format";

// Demo checkout. It talks to /api/payments/intent (server-signed amount) so the
// booking endpoint can verify the payment, but NO real money moves.
export default function PaymentModal({ venueId, method, onSuccess, onClose }) {
  const [phase, setPhase] = useState("ready"); // ready | processing | error
  const [error, setError] = useState("");
  const [intent, setIntent] = useState(null);
  const [card, setCard] = useState("4242 4242 4242 4242");

  useEffect(() => {
    let cancelled = false;
    api.paymentIntent(venueId)
      .then((i) => !cancelled && setIntent(i))
      .catch((e) => { if (!cancelled) { setError(e.message); setPhase("error"); } });
    return () => { cancelled = true; };
  }, [venueId]);

  const pay = () => {
    setPhase("processing");
    setTimeout(() => onSuccess(intent), 1600);
  };

  return (
    <div className="modal-overlay" onClick={phase === "processing" ? undefined : onClose}>
      <div className="modal pay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pay-test-banner">TEST MODE · no real money is charged</div>
        {phase === "error" ? (
          <>
            <p className="auth-error">⚠️ {error}</p>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <h2>Pay advance</h2>
            <div className="advance-amount">{intent ? inr(intent.amount) : "…"}</div>
            <p className="payment-note">via {method}</p>
            {method === "💳 Credit / Debit Card" && (
              <div className="form-group">
                <label>Test card</label>
                <input className="form-input" value={card} onChange={(e) => setCard(e.target.value)} />
              </div>
            )}
            <button className="auth-submit-btn" disabled={!intent || phase === "processing"} onClick={pay}>
              {phase === "processing" ? (<><span className="spinner sm" /> Processing…</>) : `Pay ${intent ? inr(intent.amount) : ""}`}
            </button>
            {phase !== "processing" && <button className="btn-secondary pay-cancel" onClick={onClose}>Cancel</button>}
          </>
        )}
      </div>
    </div>
  );
}
