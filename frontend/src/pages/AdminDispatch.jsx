import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AdminDispatch = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Inspect Modal State
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [inspectionDetails, setInspectionDetails] = useState(null);
  const [loadingInspection, setLoadingInspection] = useState(false);

  // Operational Action State
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const res = await axios.get(`${baseUrl}/admin/dispatch/jobs`, { params });
      if (res.data?.jobs) {
        setJobs(res.data.jobs);
      }
    } catch (err) {
      console.error('Failed to load dispatch operations:', err);
      setError(err.response?.data?.message || 'Failed to load dispatch jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [baseUrl, statusFilter]);

  // Inspect Job Details
  const handleInspectJob = async (jobId) => {
    setSelectedJobId(jobId);
    setLoadingInspection(true);
    setError('');
    try {
      const res = await axios.get(`${baseUrl}/admin/dispatch/jobs/${jobId}`);
      setInspectionDetails(res.data);
    } catch (err) {
      console.error('Failed to inspect job:', err);
      setError('Could not retrieve full job audit log and offers history.');
    } finally {
      setLoadingInspection(false);
    }
  };

  // Retry Dispatch
  const handleRetryDispatch = async (jobId) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.post(`${baseUrl}/admin/dispatch/jobs/${jobId}/retry`);
      setSuccessMsg('Dispatch operation retried successfully. Fresh offers broadcasted.');
      fetchJobs();
      if (selectedJobId === jobId) {
        handleInspectJob(jobId);
      }
    } catch (err) {
      console.error('Retry failed:', err);
      setError(err.response?.data?.message || 'Failed to retry dispatch.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Dispatch
  const handleCancelDispatch = async (jobId) => {
    if (!window.confirm('Are you sure you want to cancel this commercial dispatch job?')) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.post(`${baseUrl}/admin/dispatch/jobs/${jobId}/cancel`, {
        reason: 'Cancelled by operations administrator',
      });
      setSuccessMsg('Dispatch job cancelled and active offers withdrawn.');
      fetchJobs();
      if (selectedJobId === jobId) {
        handleInspectJob(jobId);
      }
    } catch (err) {
      console.error('Cancel failed:', err);
      setError(err.response?.data?.message || 'Failed to cancel dispatch job.');
    } finally {
      setActionLoading(false);
    }
  };

  // Status Badge Helper
  const getJobStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">
            PENDING
          </span>
        );
      case 'OFFERING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            OFFERING
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <i className="ri-checkbox-circle-fill text-emerald-400"></i>
            ASSIGNED
          </span>
        );
      case 'EXHAUSTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
            <i className="ri-alert-line text-rose-400"></i>
            EXHAUSTED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            CANCELLED
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
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
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                  Admin Dispatch Operations
                </span>
              </div>
              <p className="text-xs text-slate-400">Carrier Matching, Offer Distribution & Assignment Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchJobs}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <i className="ri-refresh-line text-sm"></i>
              <span>Refresh Operations</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full p-6 flex-1">
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
            <i className="ri-checkbox-circle-fill text-xl text-emerald-400"></i>
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <i className="ri-error-warning-fill text-xl text-rose-400"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
          {['ALL', 'OFFERING', 'ASSIGNED', 'EXHAUSTED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Operations' : st}
            </button>
          ))}
        </div>

        {/* Table / List View */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <i className="ri-loader-4-line animate-spin text-3xl text-amber-400"></i>
            <span className="text-sm">Loading dispatch operations...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <i className="ri-radar-line text-slate-500 text-4xl mx-auto mb-3 block"></i>
            <h3 className="text-base font-bold text-slate-200">No Dispatch Operations Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Confirmed cargo shipments initiated for carrier assignment will appear in this operational console.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                      {job.dispatchReference}
                    </span>
                    {getJobStatusBadge(job.status)}
                    <span className="text-xs text-slate-400 font-mono">
                      Shipment: <strong className="text-slate-200">{job.shipment?.shipmentReference}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span>
                      Category: <strong className="text-slate-200">{job.requiredVehicleCategory?.name}</strong>
                    </span>
                    <span>
                      Required Payload: <strong className="text-amber-400 font-mono">{job.requiredPayloadKg} kg</strong>
                    </span>
                    <span>
                      Attempts: <strong className="text-slate-200 font-mono">{job.attemptCount}</strong>
                    </span>
                    {job.assignedTransporter && (
                      <span className="text-emerald-400">
                        Assigned Transporter: <strong>{job.assignedTransporter?.fullname?.firstname}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleInspectJob(job._id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    Inspect
                  </button>

                  {job.status === 'EXHAUSTED' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleRetryDispatch(job._id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                    >
                      Retry
                    </button>
                  )}

                  {['PENDING', 'OFFERING', 'EXHAUSTED'].includes(job.status) && (
                    <button
                      disabled={actionLoading}
                      onClick={() => handleCancelDispatch(job._id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INSPECTION MODAL */}
        {selectedJobId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400">
                    Dispatch Operation Inspection
                  </span>
                  <h3 className="text-base font-bold font-mono text-white mt-0.5">
                    {inspectionDetails?.job?.dispatchReference || 'Loading...'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedJobId(null);
                    setInspectionDetails(null);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              {loadingInspection ? (
                <div className="p-12 text-center text-slate-400">
                  <i className="ri-loader-4-line animate-spin text-2xl text-amber-400 mx-auto mb-2 block"></i>
                  <span>Retrieving offer history and assignment audit trail...</span>
                </div>
              ) : inspectionDetails ? (
                <div className="space-y-4">
                  {/* Offers History */}
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">
                      Broadcast Offers History ({inspectionDetails.offers?.length || 0})
                    </span>

                    {inspectionDetails.offers?.length === 0 ? (
                      <p className="text-slate-500 text-[11px]">No offers broadcasted yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {inspectionDetails.offers.map((offer) => (
                          <div
                            key={offer._id}
                            className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-400">{offer.offerReference}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700 text-slate-300">
                                  {offer.status}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[11px] mt-0.5">
                                Transporter: {offer.transporter?.fullname?.firstname} ({offer.transporter?.email}) | Vehicle: {offer.vehicle?.registrationNumber}
                              </p>
                              {offer.rejectionReason && (
                                <p className="text-rose-400 text-[11px]">Reason: {offer.rejectionReason}</p>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Expires: {new Date(offer.expiresAt).toLocaleTimeString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirmed Assignment if any */}
                  {inspectionDetails.assignment && (
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                        Confirmed Carrier Assignment
                      </span>
                      <p className="font-mono font-bold text-white">
                        {inspectionDetails.assignment.assignmentReference}
                      </p>
                      <p className="text-emerald-300 text-[11px]">
                        Carrier: {inspectionDetails.assignment.transporter?.fullname?.firstname} | Assigned At: {new Date(inspectionDetails.assignment.assignedAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  )}

                  {/* Audit Log */}
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">
                      Operational Audit Trail
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {inspectionDetails.job?.auditLog?.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                          <div>
                            <span className="font-bold text-slate-200">{entry.action}</span>
                            <span className="text-slate-500 ml-2">
                              {new Date(entry.timestamp).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedJobId(null);
                    setInspectionDetails(null);
                  }}
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

export default AdminDispatch;
