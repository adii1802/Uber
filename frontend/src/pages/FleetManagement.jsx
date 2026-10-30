import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const FleetManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    registrationNumber: '',
    category: '',
    manufacturer: '',
    model: '',
    manufacturingYear: new Date().getFullYear(),
    payloadCapacityKg: '',
    cargoBodyDimensions: {
      lengthFt: '',
      widthFt: '',
      heightFt: '',
      bodyType: 'CLOSED_CONTAINER',
    },
    documentReferences: {
      rcNumber: '',
      insuranceNumber: '',
      permitType: 'STATE_PERMIT',
    },
    availabilityStatus: 'AVAILABLE',
  });

  const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // Load Vehicles and Categories on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [catRes, vehRes] = await Promise.all([
        axios.get(`${baseUrl}/vehicles/categories`),
        axios.get(`${baseUrl}/vehicles`),
      ]);

      if (catRes.data?.categories) {
        setCategories(catRes.data.categories);
      }
      if (vehRes.data?.vehicles) {
        setVehicles(vehRes.data.vehicles);
      }
    } catch (err) {
      console.error('Failed to load fleet data:', err);
      setError(err.response?.data?.message || 'Failed to load fleet data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingVehicleId(null);
    setFormData({
      registrationNumber: '',
      category: categories[0]?._id || '',
      manufacturer: '',
      model: '',
      manufacturingYear: new Date().getFullYear(),
      payloadCapacityKg: '',
      cargoBodyDimensions: {
        lengthFt: '',
        widthFt: '',
        heightFt: '',
        bodyType: 'CLOSED_CONTAINER',
      },
      documentReferences: {
        rcNumber: '',
        insuranceNumber: '',
        permitType: 'STATE_PERMIT',
      },
      availabilityStatus: 'AVAILABLE',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicleId(vehicle._id);
    setFormData({
      registrationNumber: vehicle.registrationNumber,
      category: vehicle.category?._id || vehicle.category || '',
      manufacturer: vehicle.manufacturer || '',
      model: vehicle.model || '',
      manufacturingYear: vehicle.manufacturingYear || new Date().getFullYear(),
      payloadCapacityKg: vehicle.payloadCapacityKg || '',
      cargoBodyDimensions: {
        lengthFt: vehicle.cargoBodyDimensions?.lengthFt || '',
        widthFt: vehicle.cargoBodyDimensions?.widthFt || '',
        heightFt: vehicle.cargoBodyDimensions?.heightFt || '',
        bodyType: vehicle.cargoBodyDimensions?.bodyType || 'CLOSED_CONTAINER',
      },
      documentReferences: {
        rcNumber: vehicle.documentReferences?.rcNumber || '',
        insuranceNumber: vehicle.documentReferences?.insuranceNumber || '',
        permitType: vehicle.documentReferences?.permitType || 'STATE_PERMIT',
      },
      availabilityStatus: vehicle.availabilityStatus || 'AVAILABLE',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      if (editingVehicleId) {
        // Update existing vehicle
        const res = await axios.put(`${baseUrl}/vehicles/${editingVehicleId}`, formData);
        if (res.status === 200) {
          setSuccessMsg('Vehicle specifications updated successfully');
          setIsModalOpen(false);
          fetchData();
        }
      } else {
        // Register new vehicle
        const res = await axios.post(`${baseUrl}/vehicles`, formData);
        if (res.status === 201) {
          setSuccessMsg('Commercial vehicle registered successfully and queued for verification');
          setIsModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      console.error('Vehicle submission error:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Error saving vehicle details.';
      setError(errMsg);
    }
  };

  const handleAvailabilityChange = async (vehicleId, newStatus) => {
    try {
      await axios.patch(`${baseUrl}/vehicles/${vehicleId}/availability`, {
        availabilityStatus: newStatus,
      });
      setVehicles((prev) =>
        prev.map((v) => (v._id === vehicleId ? { ...v, availabilityStatus: newStatus } : v))
      );
      setSuccessMsg('Vehicle availability updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update vehicle availability');
    }
  };

  const handleDeactivate = async (vehicleId, regNum) => {
    if (!window.confirm(`Are you sure you want to deactivate vehicle ${regNum}?`)) {
      return;
    }

    try {
      await axios.patch(`${baseUrl}/vehicles/${vehicleId}/deactivate`);
      setVehicles((prev) =>
        prev.map((v) =>
          v._id === vehicleId ? { ...v, isActive: false, availabilityStatus: 'UNAVAILABLE' } : v
        )
      );
      setSuccessMsg(`Vehicle ${regNum} has been deactivated`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate vehicle');
    }
  };

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'VERIFIED') return v.verificationStatus === 'APPROVED';
    if (filterStatus === 'PENDING') return v.verificationStatus === 'PENDING';
    if (filterStatus === 'AVAILABLE') return v.availabilityStatus === 'AVAILABLE' && v.isActive;
    if (filterStatus === 'INACTIVE') return !v.isActive;
    return true;
  });

  const totalPayloadCapacity = vehicles
    .filter((v) => v.isActive)
    .reduce((sum, v) => sum + (v.payloadCapacityKg || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/captain-home"
              className="h-10 w-10 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Return to Dashboard"
            >
              <i className="ri-arrow-left-line text-xl"></i>
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <i className="ri-truck-fill text-emerald-600"></i>
                CargoRide Fleet Management
              </h1>
              <p className="text-xs text-slate-500">Commercial Transporter Portal</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <i className="ri-add-line text-lg"></i>
            Add Vehicle
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Alerts */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-checkbox-circle-fill text-emerald-600 text-lg"></i>
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
              <i className="ri-close-line"></i>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-error-warning-fill text-red-600 text-lg"></i>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <i className="ri-close-line"></i>
            </button>
          </div>
        )}

        {/* Fleet KPI Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Fleet</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{vehicles.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Verified Vehicles</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {vehicles.filter((v) => v.verificationStatus === 'APPROVED').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Available For Hire</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {vehicles.filter((v) => v.availabilityStatus === 'AVAILABLE' && v.isActive).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Total Payload Capacity</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">
              {totalPayloadCapacity.toLocaleString('en-IN')} <span className="text-sm font-normal">kg</span>
            </p>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200">
          {['ALL', 'VERIFIED', 'PENDING', 'AVAILABLE', 'INACTIVE'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === tab
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab === 'ALL' && 'All Vehicles'}
              {tab === 'VERIFIED' && 'Verified Only'}
              {tab === 'PENDING' && 'Pending Verification'}
              {tab === 'AVAILABLE' && 'Available'}
              {tab === 'INACTIVE' && 'Deactivated'}
            </button>
          ))}
        </div>

        {/* Vehicle Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <i className="ri-loader-4-line text-3xl animate-spin inline-block mb-3 text-emerald-600"></i>
            <p>Loading your fleet specifications...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              <i className="ri-truck-line"></i>
            </div>
            <h3 className="text-base font-semibold text-slate-800">No vehicles match your filter</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Register commercial mini trucks, pickups, or cargo autos to start receiving commercial load bookings.
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
            >
              <i className="ri-add-line"></i>
              Register First Commercial Vehicle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVehicles.map((v) => (
              <div
                key={v._id}
                className={`bg-white rounded-xl border transition shadow-sm hover:shadow-md flex flex-col justify-between ${
                  !v.isActive ? 'border-slate-300 opacity-75 bg-slate-50' : 'border-slate-200'
                }`}
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="font-mono font-bold text-sm tracking-wide px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-800 inline-block shadow-inner">
                        {v.registrationNumber}
                      </span>
                      <p className="text-xs font-semibold text-emerald-700 mt-1.5 uppercase">
                        {v.category?.name || v.categoryCode}
                      </p>
                    </div>

                    {/* Verification Status Badge */}
                    {v.verificationStatus === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <i className="ri-checkbox-circle-fill"></i>
                        Verified
                      </span>
                    )}
                    {v.verificationStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        <i className="ri-time-fill"></i>
                        Pending
                      </span>
                    )}
                    {v.verificationStatus === 'REJECTED' && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200"
                        title={v.verificationDetails?.rejectionReason || 'Rejected by Admin'}
                      >
                        <i className="ri-close-circle-fill"></i>
                        Rejected
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {v.manufacturer} {v.model}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Year: {v.manufacturingYear}</p>

                  {/* Commercial Specifications List */}
                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Payload Capacity:</span>
                      <span className="font-semibold text-slate-800">
                        {v.payloadCapacityKg.toLocaleString('en-IN')} kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Cargo Dimensions:</span>
                      <span className="font-semibold text-slate-800">
                        {v.cargoBodyDimensions?.lengthFt} × {v.cargoBodyDimensions?.widthFt} ×{' '}
                        {v.cargoBodyDimensions?.heightFt} ft
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Cargo Volume:</span>
                      <span className="font-semibold text-slate-800">
                        {v.cargoBodyDimensions?.cargoVolumeCuFt ||
                          Math.round(
                            (v.cargoBodyDimensions?.lengthFt || 0) *
                              (v.cargoBodyDimensions?.widthFt || 0) *
                              (v.cargoBodyDimensions?.heightFt || 0)
                          )}{' '}
                        cu.ft
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Body Type:</span>
                      <span className="font-semibold text-slate-800">
                        {v.cargoBodyDimensions?.bodyType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Rejection notice if rejected */}
                  {v.verificationStatus === 'REJECTED' && v.verificationDetails?.rejectionReason && (
                    <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-red-800 text-xs">
                      <p className="font-semibold">Rejection Note:</p>
                      <p className="mt-0.5">{v.verificationDetails.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Card Footer Controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl flex items-center justify-between gap-2">
                  {/* Availability Dropdown */}
                  <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Availability
                    </label>
                    <select
                      disabled={!v.isActive}
                      value={v.availabilityStatus}
                      onChange={(e) => handleAvailabilityChange(v._id, e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-md px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_TRIP">On Trip</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-3">
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition"
                      title="Edit Vehicle Specifications"
                    >
                      <i className="ri-edit-line text-sm"></i>
                    </button>
                    {v.isActive ? (
                      <button
                        onClick={() => handleDeactivate(v._id, v.registrationNumber)}
                        className="p-1.5 text-red-600 hover:text-red-800 bg-white border border-slate-200 rounded-md hover:bg-red-50 transition"
                        title="Deactivate Vehicle"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 px-2">Deactivated</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal: Add / Edit Commercial Vehicle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingVehicleId ? 'Edit Vehicle Specifications' : 'Register Commercial Cargo Vehicle'}
                </h2>
                <p className="text-xs text-slate-500">
                  Provide vehicle registration and certified payload dimensions
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commercial Vehicle Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} (Payload: {c.payloadRange?.minKg} - {c.payloadRange?.maxKg} kg)
                    </option>
                  ))}
                </select>
              </div>

              {/* Registration Number & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration Number (RTO) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-12-AB-1234"
                    value={formData.registrationNumber}
                    disabled={!!editingVehicleId}
                    onChange={(e) =>
                      setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Normalized automatically</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturing Year *
                  </label>
                  <input
                    type="number"
                    required
                    min="1995"
                    max={new Date().getFullYear() + 1}
                    value={formData.manufacturingYear}
                    onChange={(e) =>
                      setFormData({ ...formData, manufacturingYear: e.target.value })
                    }
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Manufacturer & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Motors, Mahindra, Eicher"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ace Gold, Bolero Pickup, Pro 2049"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Payload Capacity & Body Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payload Capacity (kg) *
                  </label>
                  <input
                    type="number"
                    required
                    min="50"
                    placeholder="e.g. 850"
                    value={formData.payloadCapacityKg}
                    onChange={(e) =>
                      setFormData({ ...formData, payloadCapacityKg: e.target.value })
                    }
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo Body Type *
                  </label>
                  <select
                    value={formData.cargoBodyDimensions.bodyType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cargoBodyDimensions: {
                          ...formData.cargoBodyDimensions,
                          bodyType: e.target.value,
                        },
                      })
                    }
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CLOSED_CONTAINER">Closed Container (Waterproof)</option>
                    <option value="OPEN_BED">Open Bed (Truck Bed)</option>
                    <option value="TARPAULIN_COVERED">Tarpaulin Covered</option>
                    <option value="REFRIGERATED_CONTAINER">Refrigerated Container (Cold Chain)</option>
                    <option value="FLATBED">Flatbed</option>
                  </select>
                </div>
              </div>

              {/* Cargo Bed Dimensions */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Cargo Bed Dimensions (Feet) *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Length (ft)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      required
                      placeholder="7.2"
                      value={formData.cargoBodyDimensions.lengthFt}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cargoBodyDimensions: {
                            ...formData.cargoBodyDimensions,
                            lengthFt: e.target.value,
                          },
                        })
                      }
                      className="w-full text-sm bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Width (ft)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      required
                      placeholder="4.8"
                      value={formData.cargoBodyDimensions.widthFt}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cargoBodyDimensions: {
                            ...formData.cargoBodyDimensions,
                            widthFt: e.target.value,
                          },
                        })
                      }
                      className="w-full text-sm bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Height (ft)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      required
                      placeholder="4.5"
                      value={formData.cargoBodyDimensions.heightFt}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cargoBodyDimensions: {
                            ...formData.cargoBodyDimensions,
                            heightFt: e.target.value,
                          },
                        })
                      }
                      className="w-full text-sm bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                {formData.cargoBodyDimensions.lengthFt &&
                  formData.cargoBodyDimensions.widthFt &&
                  formData.cargoBodyDimensions.heightFt && (
                    <p className="text-xs text-emerald-700 font-semibold mt-2">
                      Estimated Cargo Volume:{' '}
                      {Math.round(
                        formData.cargoBodyDimensions.lengthFt *
                          formData.cargoBodyDimensions.widthFt *
                          formData.cargoBodyDimensions.heightFt
                      )}{' '}
                      cu.ft
                    </p>
                  )}
              </div>

              {/* Documentation References */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RC Book Number (Reference)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RC-MH12-2022-XXXX"
                    value={formData.documentReferences.rcNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        documentReferences: {
                          ...formData.documentReferences,
                          rcNumber: e.target.value,
                        },
                      })
                    }
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Permit Classification
                  </label>
                  <select
                    value={formData.documentReferences.permitType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        documentReferences: {
                          ...formData.documentReferences,
                          permitType: e.target.value,
                        },
                      })
                    }
                    className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="STATE_PERMIT">State Transit Permit</option>
                    <option value="NATIONAL_PERMIT">All India National Permit (NP)</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
                >
                  {editingVehicleId ? 'Update Specifications' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManagement;
