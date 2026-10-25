import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { quote, inr, prettyDate, fallbackImg } from "../services/format";
import PaymentModal from "../components/PaymentModal";
import Confetti from "../components/Confetti";

const METHODS = ["💳 Credit / Debit Card", "📱 UPI", "🏦 Net Banking", "💵 Pay at Venue"];

export default function Booking() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(null);
  const [method, setMethod] = useState(METHODS[1]);
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "", notes: "" });

  if (!state?.venue) {
    return (
      <div className="not-found">
        No booking details found. <button onClick={() => navigate("/venues")}>Browse Venues</button>
      </div>
    );
  }

  const { venue, date, guests, eventType } = state;
  const q = quote(venue.price);
  const payAtVenue = method.includes("Pay at Venue");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const createBooking = async (intent) => {
    setPaying(false);
    setSaving(true);
    setError("");
    try {
      const b = await api.book({
        venueId: venue.id, date, guests, eventType, ...form,
        paymentMethod: payAtVenue ? "Pay at Venue" : method.replace(/^\S+\s/, ""),
        paymentId: intent?.paymentId, signature: intent?.signature,
      });
      setConfirmed(b);
    } catch (e) {
      setError(e.message);
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (payAtVenue) createBooking(null);
    else setPaying(true);
  };

  if (confirmed) {
    return (
      <div className="booking-success">
        <Confetti />
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <h1>Booking Confirmed!</h1>
          <p>Your date is reserved. Find the full details any time under <strong>My Bookings</strong>.</p>
          <div className="booking-ref">Booking ID: <strong>{confirmed.id}</strong></div>
          <div className="success-details">
            <div className="sd-row"><span>Venue</span><span>{confirmed.venueName}</span></div>
            <div className="sd-row"><span>Date</span><span>{prettyDate(confirmed.date)}</span></div>
            <div className="sd-row"><span>Guests</span><span>{confirmed.guests}</span></div>
            <div className="sd-row"><span>{confirmed.paid ? "Advance Paid" : "Due at venue (advance)"}</span><span>{inr(confirmed.paid || confirmed.advance)}</span></div>
          </div>
          <div className="success-actions">
            <button className="btn-primary" onClick={() => navigate("/bookings")}>View My Bookings</button>
            <button className="btn-secondary" onClick={() => navigate("/venues")}>Explore More</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      {paying && (
        <PaymentModal venueId={venue.id} method={method} onSuccess={createBooking} onClose={() => setPaying(false)} />
      )}
      <div className="booking-layout">
        {/* Left: Form */}
        <div className="booking-form-side">
          <div className="booking-steps">
            <div className={`step ${step >= 1 ? "active" : ""}`}>1. Details</div>
            <div className="step-line" />
            <div className={`step ${step >= 2 ? "active" : ""}`}>2. Payment</div>
            <div className="step-line" />
            <div className={`step ${step >= 3 ? "active" : ""}`}>3. Confirm</div>
          </div>

          {error && <div className="auth-error">⚠️ {error}</div>}

          {step === 1 && (
            <form className="booking-details-form" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <h2>Your Details</h2>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={form.name} onChange={set("name")} className="form-input" required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={set("email")} className="form-input" required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={form.phone} onChange={set("phone")} className="form-input" required placeholder="+91 ..." />
              </div>
              <div className="form-group">
                <label>Special Requests (optional)</label>
                <textarea value={form.notes} onChange={set("notes")} className="form-input form-textarea" placeholder="Any special arrangements..." />
              </div>
              <button type="submit" className="auth-submit-btn">Continue to Payment →</button>
            </form>
          )}

          {step === 2 && (
            <form className="booking-payment-form" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
              <h2>Payment</h2>
              <p className="payment-note">Pay 50% advance now. Remaining to be paid at venue.</p>
              <div className="advance-amount">{inr(q.advance)} <span>advance</span></div>
              <div className="payment-methods">
                {METHODS.map(m => (
                  <label key={m} className="payment-option">
                    <input type="radio" name="payment" checked={method === m} onChange={() => setMethod(m)} />
                    {m}
                  </label>
                ))}
              </div>
              {payAtVenue && <p className="payment-note">You'll pay the advance directly at the venue. The date is held for you meanwhile.</p>}
              <div className="step-buttons">
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="auth-submit-btn">Review & Confirm →</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form className="booking-confirm-form" onSubmit={handleConfirm}>
              <h2>Review & Confirm</h2>
              <div className="confirm-details">
                <div className="cd-row"><span>Name</span><span>{form.name}</span></div>
                <div className="cd-row"><span>Email</span><span>{form.email}</span></div>
                <div className="cd-row"><span>Phone</span><span>{form.phone}</span></div>
                <div className="cd-row"><span>Event</span><span>{eventType}</span></div>
                <div className="cd-row"><span>Date</span><span>{prettyDate(date)}</span></div>
                <div className="cd-row"><span>Guests</span><span>{guests}</span></div>
                <div className="cd-row"><span>Payment</span><span>{method}</span></div>
                <div className="cd-row cd-total"><span>Advance Due</span><span>{inr(q.advance)}</span></div>
              </div>
              <label className="checkbox-label">
                <input type="checkbox" required />
                I agree to the venue's terms & cancellation policy (full advance refund 15+ days before the event, 50% after)
              </label>
              <div className="step-buttons">
                <button type="button" className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button type="submit" className="auth-submit-btn" disabled={saving}>
                  {saving ? "Booking…" : payAtVenue ? "Confirm Booking" : `Confirm & Pay ${inr(q.advance)}`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right: Summary */}
        <div className="booking-summary-side">
          <h3>Booking Summary</h3>
          <img src={venue.image} alt={venue.name} className="summary-img" onError={fallbackImg} />
          <h4>{venue.name}</h4>
          <p>📍 {venue.location}, {venue.city}</p>
          <div className="summary-grid">
            <div className="sg-item"><span>Event</span><strong>{eventType}</strong></div>
            <div className="sg-item"><span>Date</span><strong>{prettyDate(date)}</strong></div>
            <div className="sg-item"><span>Guests</span><strong>{guests}</strong></div>
            <div className="sg-item"><span>Capacity</span><strong>{venue.capacity}</strong></div>
          </div>
          <div className="summary-price-breakdown">
            <div className="spb-row"><span>Venue Charge</span><span>{inr(q.price)}</span></div>
            <div className="spb-row"><span>Service Fee (5%)</span><span>{inr(q.fee)}</span></div>
            <div className="spb-row spb-total"><span>Total</span><span>{inr(q.total)}</span></div>
            <div className="spb-row spb-advance"><span>Advance (50%)</span><span>{inr(q.advance)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
