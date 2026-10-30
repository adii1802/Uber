import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Countdown badge component for offer expiration
 */
const ExpiryTimer = ({ expiresAt, onExpired }) => {
  const calculateSecondsLeft = () => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateSecondsLeft);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = calculateSecondsLeft();
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        if (onExpired) onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (secondsLeft <= 0) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
        <i className="ri-alarm-warning-line"></i>
        <span>EXPIRED</span>
      </span>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft < 30;

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 ${
        isUrgent
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      }`}
    >
      <i className="ri-timer-line text-xs"></i>
      <span>
        {mins}:{secs < 10 ? `0${secs}` : secs} left
      </span>
    </span>
  );
};

const JobOffers = () => {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedOfferForReject, setSelectedOfferForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Accept Loading State
  const [acceptingOfferId, setAcceptingOfferId] = useState(null);

  const fetchOffers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${baseUrl}/dispatch/offers`);
      if (res.data?.offers) {
        setOffers(res.data.offers);
      }
    } catch (err) {
      console.error('Failed to load dispatch offers:', err);
      setError(
        err.response?.data?.message || 'Failed to retrieve active job offers. Please check connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();

    // Auto-refresh every 15 seconds to discover new dispatch broadcasts
    const refreshTimer = setInterval(fetchOffers, 15000);
    return () => clearInterval(refreshTimer);
  }, [baseUrl]);

  // Handle Offer Acceptance
  const handleAcceptOffer = async (offerId) => {
    setAcceptingOfferId(offerId);
    setError('');
    setActionSuccess('');

    try {
      const res = await axios.post(`${baseUrl}/dispatch/offers/${offerId}/accept`);
      setActionSuccess(
        `Job Accepted! Shipment assigned to your vehicle ${res.data?.assignment?.assignmentReference}. Redirecting...`
      );

      // Refresh list and navigate to assigned jobs after short delay
      setTimeout(() => {
        navigate('/captain/assigned-jobs');
      }, 1500);
    } catch (err) {
      console.error('Failed to accept offer:', err);
      setError(
        err.response?.data?.message ||
          'Failed to accept offer. Another transporter may have accepted this consignment first.'
      );
      fetchOffers();
    } finally {
      setAcceptingOfferId(null);
    }
  };

  // Handle Offer Rejection
  const handleConfirmReject = async () => {
    if (!selectedOfferForReject) return;
    setRejecting(true);
    setError('');

    try {
      await axios.post(`${baseUrl}/dispatch/offers/${selectedOfferForReject._id}/reject`, {
        rejectionReason: rejectionReason.trim() || 'Driver unavailable for this trip schedule',
      });

      setRejectModalOpen(false);
      setSelectedOfferForReject(null);
      setRejectionReason('');
      fetchOffers();
    } catch (err) {
      console.error('Failed to reject offer:', err);
      setError(err.response?.data?.message || 'Failed to reject offer.');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/captain-home"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
              title="Dashboard"
            >
              <i className="ri-arrow-left-line text-lg"></i>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black tracking-wider text-lg">CARGORIDE</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                  Transporter Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-400">Available Commercial Freight Job Offers</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOffers}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <i className="ri-refresh-line text-sm"></i>
              <span>Refresh</span>
            </button>
            <Link
              to="/captain/assigned-jobs"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <i className="ri-truck-fill text-amber-400 text-sm"></i>
              <span>Assigned Jobs</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto w-full p-6 flex-1">
        {/* Banner Feedback */}
        {actionSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
            <i className="ri-checkbox-circle-fill text-xl text-emerald-400"></i>
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <i className="ri-error-warning-fill text-xl text-rose-400"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <i className="ri-loader-4-line animate-spin text-3xl text-amber-400"></i>
            <span className="text-sm">Scanning live commercial freight dispatch network...</span>
          </div>
        ) : offers.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 text-3xl mx-auto mb-4">
              <i className="ri-radar-line"></i>
            </div>
            <h3 className="text-base font-bold text-slate-200">No Job Offers Available Right Now</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              When cargo bookings matching your verified fleet vehicles are confirmed by shippers, live job offers will appear here with an expiration timer.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={fetchOffers}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition flex items-center gap-2"
              >
                <i className="ri-refresh-line"></i>
                <span>Check Again</span>
              </button>
              <Link
                to="/captain/fleet"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2"
              >
                <i className="ri-truck-line"></i>
                <span>Manage Fleet</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Offers List */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>Active Job Offers</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300 font-bold">
                  {offers.length}
                </span>
              </h2>
              <span className="text-xs text-slate-400">
                Offers expire automatically if not accepted within the timer window.
              </span>
            </div>

            {offers.map((offer) => {
              const isAccepting = acceptingOfferId === offer._id;

              return (
                <div
                  key={offer._id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition shadow-lg"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                        {offer.offerReference}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Shipment: <strong className="text-slate-200">{offer.shipment?.shipmentReference || 'Direct'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <ExpiryTimer
                        expiresAt={offer.expiresAt}
                        onExpired={() => {
                          fetchOffers();
                        }}
                      />
                    </div>
                  </div>

                  {/* Locations & Route Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 text-xs">
                    {/* Origin & Delivery */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <i className="ri-map-pin-2-fill text-amber-400 text-sm shrink-0 mt-0.5"></i>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Pickup (Origin)
                          </span>
                          <p className="font-medium text-slate-200">
                            {offer.pickupSnapshot?.city}, {offer.pickupSnapshot?.state} ({offer.pickupSnapshot?.postalCode})
                          </p>
                          <p className="text-slate-400 text-[11px] truncate max-w-xs">
                            {offer.pickupSnapshot?.addressLine}
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            Site: {offer.pickupSnapshot?.contactPerson}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <i className="ri-flag-2-fill text-emerald-400 text-sm shrink-0 mt-0.5"></i>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Destination (Consignee)
                          </span>
                          <p className="font-medium text-slate-200">
                            {offer.dropoffSnapshot?.city}, {offer.dropoffSnapshot?.state} ({offer.dropoffSnapshot?.postalCode})
                          </p>
                          <p className="text-slate-400 text-[11px] truncate max-w-xs">
                            {offer.dropoffSnapshot?.addressLine}
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            Contact: {offer.dropoffSnapshot?.contactPerson}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cargo Specs */}
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-sky-400 block">
                        Cargo Specifications
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Commodity:</span>
                        <span className="font-medium text-slate-200 truncate max-w-[140px]">
                          {offer.cargoSnapshot?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payload Weight:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {offer.cargoSnapshot?.weightKg} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Packaging:</span>
                        <span className="text-slate-300">
                          {offer.cargoSnapshot?.packageCount} x {offer.cargoSnapshot?.packagingType}
                        </span>
                      </div>
                      {offer.cargoSnapshot?.isFragile && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Fragile Freight
                        </span>
                      )}
                    </div>

                    {/* Allocated Vehicle in Transporter Fleet */}
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                        Target Vehicle in Your Fleet
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Registration:</span>
                        <span className="font-mono font-bold text-white">
                          {offer.vehicle?.registrationNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Model:</span>
                        <span className="text-slate-200">
                          {offer.vehicle?.manufacturer} {offer.vehicle?.model}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payload Cap:</span>
                        <span className="font-mono text-slate-300">
                          {offer.vehicle?.payloadCapacityKg} kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={isAccepting}
                      onClick={() => {
                        setSelectedOfferForReject(offer);
                        setRejectionReason('');
                        setRejectModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={isAccepting}
                      onClick={() => handleAcceptOffer(offer._id)}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
                    >
                      {isAccepting ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-sm"></i>
                          <span>Assigning Job...</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-check-line text-sm"></i>
                          <span>Accept & Assign Job</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REJECT MODAL */}
        {rejectModalOpen && selectedOfferForReject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xl mx-auto mb-4 border border-slate-700">
                <i className="ri-close-circle-line"></i>
              </div>

              <h3 className="text-center text-base font-bold text-white">Decline Dispatch Offer?</h3>
              <p className="text-center text-xs text-slate-400 mt-1 mb-4">
                Offer Ref: <strong className="text-amber-400 font-mono">{selectedOfferForReject.offerReference}</strong>
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Decline Reason (Optional)
                </label>
                <textarea
                  rows="2"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Vehicle scheduled for maintenance, or schedule overlap"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={rejecting}
                  onClick={() => {
                    setRejectModalOpen(false);
                    setSelectedOfferForReject(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Keep Offer
                </button>
                <button
                  type="button"
                  disabled={rejecting}
                  onClick={handleConfirmReject}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {rejecting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      <span>Declining...</span>
                    </>
                  ) : (
                    <span>Confirm Decline</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default JobOffers;
