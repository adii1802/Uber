import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AssignedJobs = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${baseUrl}/dispatch/jobs`);
      if (res.data?.assignments) {
        setAssignments(res.data.assignments);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError(
        err.response?.data?.message || 'Failed to retrieve assigned freight jobs. Please check connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [baseUrl]);

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
                  Fleet Operations
                </span>
              </div>
              <p className="text-xs text-slate-400">Assigned Commercial Consignments</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/captain/offers"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <i className="ri-notification-3-line text-sm text-amber-400"></i>
              <span>Live Offers</span>
            </Link>
            <Link
              to="/captain/fleet"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <i className="ri-truck-line text-sm text-emerald-400"></i>
              <span>Fleet</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full p-6 flex-1">
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
            <span className="text-sm">Loading assigned freight consignments...</span>
          </div>
        ) : assignments.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 text-3xl mx-auto mb-4">
              <i className="ri-file-list-3-line"></i>
            </div>
            <h3 className="text-base font-bold text-slate-200">No Assigned Commercial Freight Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
              When you accept a commercial dispatch offer, your assigned freight consignments and designated carrier vehicles will appear here.
            </p>
            <Link
              to="/captain/offers"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              <i className="ri-radar-line"></i>
              <span>View Live Job Offers</span>
            </Link>
          </div>
        ) : (
          /* Assignment Cards */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>Active Consignment Assignments</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                  {assignments.length}
                </span>
              </h2>
              <span className="text-xs text-slate-400">
                Vehicle status is marked ON_TRIP while assigned to active commercial freight.
              </span>
            </div>

            {assignments.map((assignment) => {
              const job = assignment.dispatchJob;
              const shipment = assignment.shipment;
              const vehicle = assignment.vehicle;

              return (
                <div
                  key={assignment._id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition shadow-lg"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                        {assignment.assignmentReference}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ASSIGNMENT: {assignment.assignmentStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <i className="ri-time-line"></i>
                      <span>
                        Assigned:{' '}
                        <strong className="text-slate-200">
                          {new Date(assignment.assignedAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4 text-xs">
                    {/* Route Details */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <i className="ri-map-pin-2-fill text-amber-400 text-sm shrink-0 mt-0.5"></i>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Origin Facility
                          </span>
                          <p className="font-medium text-slate-200">
                            {job?.pickupLocationSnapshot?.city}, {job?.pickupLocationSnapshot?.state} ({job?.pickupLocationSnapshot?.postalCode})
                          </p>
                          <p className="text-slate-400 text-[11px] truncate max-w-xs">
                            {job?.pickupLocationSnapshot?.addressLine}
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            Site Incharge: {job?.pickupLocationSnapshot?.contactPerson} ({job?.pickupLocationSnapshot?.contactPhone})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <i className="ri-flag-2-fill text-emerald-400 text-sm shrink-0 mt-0.5"></i>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Destination Facility
                          </span>
                          <p className="font-medium text-slate-200">
                            {job?.deliveryLocationSnapshot?.city}, {job?.deliveryLocationSnapshot?.state} ({job?.deliveryLocationSnapshot?.postalCode})
                          </p>
                          <p className="text-slate-400 text-[11px] truncate max-w-xs">
                            {job?.deliveryLocationSnapshot?.addressLine}
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            Receiving: {job?.deliveryLocationSnapshot?.contactPerson} ({job?.deliveryLocationSnapshot?.contactPhone})
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cargo Snapshot */}
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-sky-400 block">
                        Cargo Manifest
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cargo:</span>
                        <span className="font-medium text-slate-200 truncate max-w-[140px]">
                          {job?.cargoSnapshot?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Weight:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {job?.cargoSnapshot?.weightKg} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Packages:</span>
                        <span className="text-slate-300">
                          {job?.cargoSnapshot?.packageCount} x {job?.cargoSnapshot?.packagingType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Shipment Ref:</span>
                        <span className="font-mono font-bold text-white">
                          {shipment?.shipmentReference || 'Linked'}
                        </span>
                      </div>
                    </div>

                    {/* Assigned Vehicle */}
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                        Assigned Vehicle in Your Fleet
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Registration:</span>
                        <span className="font-mono font-bold text-white">
                          {vehicle?.registrationNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Model:</span>
                        <span className="text-slate-200">
                          {vehicle?.manufacturer} {vehicle?.model}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vehicle Status:</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ON_TRIP (RESERVED)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informational Footer Note */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="ri-information-line text-amber-400"></i>
                      <span>
                        Consignment is formally assigned to your commercial vehicle. Real-time GPS gateway telemetry and OTP verification will activate in subsequent milestones.
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedAssignment(assignment)}
                      className="text-amber-400 hover:text-amber-300 font-semibold whitespace-nowrap ml-4"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DETAILS MODAL */}
        {selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400">
                    Commercial Assignment Details
                  </span>
                  <h3 className="text-base font-bold font-mono text-white mt-0.5">
                    {selectedAssignment.assignmentReference}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700">
                  <span className="text-slate-400">Assigned Timestamp:</span>
                  <span className="text-slate-200 font-mono">
                    {new Date(selectedAssignment.assignedAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700">
                  <span className="text-slate-400">Source:</span>
                  <span className="text-slate-200 font-mono">{selectedAssignment.assignmentSource}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700">
                  <span className="text-slate-400">Vehicle:</span>
                  <span className="text-slate-200 font-bold font-mono">
                    {selectedAssignment.vehicle?.registrationNumber} ({selectedAssignment.vehicle?.model})
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AssignedJobs;
