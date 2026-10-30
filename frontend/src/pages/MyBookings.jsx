import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const MyBookings = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const [bookings, setBookings] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Fetch Bookings & Shipments
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingsRes, shipmentsRes] = await Promise.all([
        axios.get(`${baseUrl}/bookings`),
        axios.get(`${baseUrl}/shipments`),
      ]);

      if (bookingsRes.data?.bookings) {
        setBookings(bookingsRes.data.bookings);
      }
      if (shipmentsRes.data?.shipments) {
        setShipments(shipmentsRes.data.shipments);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setError('Could not retrieve your cargo transportation records. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [baseUrl]);

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancelling(true);
    setCancelError('');

    try {
      await axios.patch(`${baseUrl}/bookings/${bookingToCancel._id}/cancel`, {
        cancellationReason: cancellationReason.trim() || 'Cancelled by customer via portal',
      });

      setCancelModalOpen(false);
      setBookingToCancel(null);
      setCancellationReason('');
      fetchData(); // refresh list
    } catch (err) {
      console.error('Cancellation failed:', err);
      setCancelError(
        err.response?.data?.message || 'Failed to cancel the booking. State may have already changed.'
      );
    } finally {
      setCancelling(false);
    }
  };

  // Helper to find shipment for a confirmed booking
  const getShipmentForBooking = (bookingId) => {
    return shipments.find(
      (s) => s.booking === bookingId || s.booking?._id === bookingId
    );
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.bookingStatus === statusFilter;
  });

  // Status Badge Styles
  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUESTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            REQUESTED
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <i className="ri-checkbox-circle-fill text-emerald-400"></i>
            CONFIRMED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
            <i className="ri-close-circle-fill text-rose-400"></i>
            CANCELLED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1.5">
            <i className="ri-time-line text-slate-400"></i>
            EXPIRED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 font-mono">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/home"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
              title="Dashboard"
            >
              <i className="ri-arrow-left-line text-lg"></i>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black tracking-wider text-lg">CARGORIDE</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 rounded">
                  Consignment Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Commercial Cargo Bookings & Physical Consignments</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/book-cargo"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition flex items-center gap-2"
            >
              <i className="ri-add-line text-base"></i>
              <span>Book Cargo</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full p-6 flex-1">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Total Bookings
            </span>
            <p className="text-2xl font-black text-white mt-1 font-mono">{bookings.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
              Requested
            </span>
            <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
              {bookings.filter((b) => b.bookingStatus === 'REQUESTED').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
              Confirmed / Active
            </span>
            <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] uppercase tracking-wider text-rose-400 font-semibold">
              Cancelled
            </span>
            <p className="text-2xl font-black text-rose-400 mt-1 font-mono">
              {bookings.filter((b) => b.bookingStatus === 'CANCELLED').length}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
          {['ALL', 'REQUESTED', 'CONFIRMED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Bookings' : st}
            </button>
          ))}
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <i className="ri-loader-4-line animate-spin text-3xl text-amber-400"></i>
            <span className="text-sm">Retrieving freight bookings & physical consignments...</span>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/40 rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 text-3xl mx-auto mb-4">
              <i className="ri-truck-line"></i>
            </div>
            <h3 className="text-base font-bold text-slate-200">No Cargo Bookings Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              You do not have any freight bookings in the &quot;{statusFilter}&quot; category.
            </p>
            <Link
              to="/book-cargo"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              <i className="ri-add-line"></i>
              <span>Create Cargo Booking</span>
            </Link>
          </div>
        ) : (
          /* Bookings List */
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const linkedShipment = getShipmentForBooking(b._id);

              return (
                <div
                  key={b._id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                        {b.bookingReference}
                      </span>
                      {getStatusBadge(b.bookingStatus)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <i className="ri-calendar-line"></i>
                      <span>
                        Requested Pickup:{' '}
                        <strong className="text-slate-200">
                          {new Date(b.requestedPickupAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 text-xs">
                    {/* Origin & Dropoff */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <i className="ri-map-pin-2-fill text-amber-400 text-sm shrink-0 mt-0.5"></i>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-semibold">Origin</p>
                          <p className="text-slate-200 font-medium">
                            {b.pickup?.city}, {b.pickup?.state} ({b.pickup?.postalCode})
                          </p>
                          <p className="text-slate-500 text-[11px] truncate max-w-xs">
                            {b.pickup?.addressLine}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <i className="ri-flag-2-fill text-emerald-400 text-sm shrink-0 mt-0.5"></i>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-semibold">Destination</p>
                          <p className="text-slate-200 font-medium">
                            {b.dropoff?.city}, {b.dropoff?.state} ({b.dropoff?.postalCode})
                          </p>
                          <p className="text-slate-500 text-[11px] truncate max-w-xs">
                            {b.dropoff?.addressLine}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cargo Specifications */}
                    <div className="space-y-1.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cargo:</span>
                        <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                          {b.cargo?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Weight:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {b.cargo?.weightKg} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Package Type:</span>
                        <span className="text-slate-300">
                          {b.cargo?.packageCount} x {b.cargo?.packagingType}
                        </span>
                      </div>
                      {b.cargo?.isFragile && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Fragile
                        </span>
                      )}
                    </div>

                    {/* Vehicle & Category */}
                    <div className="space-y-1.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Category:</span>
                        <span className="font-semibold text-slate-200">
                          {b.requestedVehicleCategory?.name || 'Commercial Freight Category'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payload Limit:</span>
                        <span className="font-mono text-slate-300">
                          {b.requestedVehicleCategory?.payloadCapacityKg || 'Standard'} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Created:</span>
                        <span className="text-slate-300">
                          {new Date(b.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked Physical Shipment Consignment Banner (When Confirmed) */}
                  {b.bookingStatus === 'CONFIRMED' && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <i className="ri-truck-fill text-emerald-400 text-lg"></i>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                              Active Physical Consignment Manifest
                            </span>
                            <span className="font-mono font-bold text-white text-sm">
                              {linkedShipment?.shipmentReference || 'Consignment Initialized'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            STATUS: {linkedShipment?.shipmentStatus || 'CREATED'}
                          </span>
                          {linkedShipment && (
                            <button
                              onClick={() => setSelectedShipment(linkedShipment)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1"
                            >
                              <i className="ri-eye-line"></i>
                              <span>Track Consignment</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-emerald-300/80 mt-2">
                        <i className="ri-information-line mr-1"></i>
                        Physical shipment record created. Transporter assignment and live GPS telemetry will activate upon vehicle dispatch in the next milestone.
                      </p>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                    >
                      <i className="ri-information-line"></i>
                      <span>View Full Specifications</span>
                    </button>

                    {b.bookingStatus === 'REQUESTED' && (
                      <button
                        onClick={() => {
                          setBookingToCancel(b);
                          setCancelError('');
                          setCancellationReason('');
                          setCancelModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <i className="ri-close-circle-line"></i>
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOOKING DETAILS MODAL */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="font-mono text-amber-400">{selectedBooking.bookingReference}</span>
                    {getStatusBadge(selectedBooking.bookingStatus)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Commercial Booking Specifications</p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Locations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">
                      Pickup Facility (Origin)
                    </span>
                    <p className="text-slate-200 font-medium">{selectedBooking.pickup?.addressLine}</p>
                    {selectedBooking.pickup?.locality && (
                      <p className="text-slate-400">{selectedBooking.pickup?.locality}</p>
                    )}
                    <p className="text-slate-300">
                      {selectedBooking.pickup?.city}, {selectedBooking.pickup?.state} -{' '}
                      <span className="font-mono">{selectedBooking.pickup?.postalCode}</span>
                    </p>
                    <p className="text-slate-400 pt-1 border-t border-slate-700/50">
                      Contact: {selectedBooking.pickup?.contactPerson} ({selectedBooking.pickup?.contactPhone})
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                      Consignee Facility (Destination)
                    </span>
                    <p className="text-slate-200 font-medium">{selectedBooking.dropoff?.addressLine}</p>
                    {selectedBooking.dropoff?.locality && (
                      <p className="text-slate-400">{selectedBooking.dropoff?.locality}</p>
                    )}
                    <p className="text-slate-300">
                      {selectedBooking.dropoff?.city}, {selectedBooking.dropoff?.state} -{' '}
                      <span className="font-mono">{selectedBooking.dropoff?.postalCode}</span>
                    </p>
                    <p className="text-slate-400 pt-1 border-t border-slate-700/50">
                      Contact: {selectedBooking.dropoff?.contactPerson} ({selectedBooking.dropoff?.contactPhone})
                    </p>
                  </div>
                </div>

                {/* Cargo Details */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-sky-400 block">
                    Cargo Specifications
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-400 block">Commodity:</span>
                      <span className="font-medium">{selectedBooking.cargo?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Category:</span>
                      <span>{selectedBooking.cargo?.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Weight:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {selectedBooking.cargo?.weightKg} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Packages:</span>
                      <span>
                        {selectedBooking.cargo?.packageCount} x {selectedBooking.cargo?.packagingType}
                      </span>
                    </div>
                  </div>

                  {selectedBooking.cargo?.dimensions && (
                    <div className="pt-2 border-t border-slate-700/50 flex gap-4 text-slate-400">
                      <span>
                        Dimensions:{' '}
                        <strong className="text-slate-200 font-mono">
                          {selectedBooking.cargo.dimensions.lengthFt} x{' '}
                          {selectedBooking.cargo.dimensions.widthFt} x{' '}
                          {selectedBooking.cargo.dimensions.heightFt} ft
                        </strong>
                      </span>
                      {selectedBooking.cargo.dimensions.volumeCuFt && (
                        <span>
                          Volume:{' '}
                          <strong className="text-slate-200 font-mono">
                            {selectedBooking.cargo.dimensions.volumeCuFt} cu. ft
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                  {selectedBooking.cargo?.handlingInstructions && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <span className="text-slate-400 block">Handling Instructions:</span>
                      <p className="text-slate-300 mt-0.5">{selectedBooking.cargo.handlingInstructions}</p>
                    </div>
                  )}
                </div>

                {/* Special Instructions */}
                {selectedBooking.specialInstructions && (
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-purple-400 block mb-1">
                      Commercial Gate / Dock Instructions
                    </span>
                    <p className="text-slate-300">{selectedBooking.specialInstructions}</p>
                  </div>
                )}

                {/* Status Timeline / Reason */}
                {selectedBooking.cancellationReason && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                    <span className="font-bold block">Cancellation Reason:</span>
                    <p className="mt-0.5">{selectedBooking.cancellationReason}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHIPMENT CONSIGNMENT MODAL */}
        {selectedShipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Physical Consignment Manifest
                  </span>
                  <h3 className="text-lg font-bold font-mono text-white mt-0.5">
                    {selectedShipment.shipmentReference}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedShipment(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-slate-400">Consignment Status</span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {selectedShipment.shipmentStatus}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-slate-400">Booking Reference</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {selectedShipment.bookingReference || 'Linked'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Consignment Event Timeline
                  </span>
                  <div className="space-y-2">
                    {selectedShipment.timeline && selectedShipment.timeline.length > 0 ? (
                      selectedShipment.timeline.map((ev, i) => (
                        <div key={i} className="flex items-start gap-2 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5"></span>
                          <div className="flex-1">
                            <span className="font-semibold text-white">{ev.status}</span>
                            <span className="text-[10px] text-slate-500 ml-2">
                              {new Date(ev.timestamp).toLocaleString('en-IN')}
                            </span>
                            {ev.notes && <p className="text-slate-400 mt-0.5">{ev.notes}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">Consignment created and awaiting carrier assignment.</p>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] leading-relaxed">
                  <i className="ri-road-map-line mr-1"></i>
                  <strong>Tracking Foundation:</strong> The physical consignment manifest is recorded in CargoRide. Real-time GPS transporter telemetry will activate upon vehicle dispatch in the next milestone.
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedShipment(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CANCELLATION CONFIRMATION MODAL */}
        {cancelModalOpen && bookingToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl mx-auto mb-4 border border-rose-500/30">
                <i className="ri-error-warning-line"></i>
              </div>

              <h3 className="text-center text-lg font-bold text-white">Cancel Cargo Booking?</h3>
              <p className="text-center text-xs text-slate-400 mt-1 mb-4">
                Booking Reference:{' '}
                <strong className="text-amber-400 font-mono">
                  {bookingToCancel.bookingReference}
                </strong>
              </p>

              {cancelError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-3">
                  {cancelError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  rows="2"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Consignment postponed or alternate logistics arranged"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-rose-400"
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => {
                    setCancelModalOpen(false);
                    setBookingToCancel(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {cancelling ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Confirm Cancel</span>
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

export default MyBookings;
