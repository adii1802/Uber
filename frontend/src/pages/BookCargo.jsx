import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const BookCargo = () => {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // Available vehicle categories from backend
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    pickup: {
      addressLine: '',
      locality: '',
      city: '',
      state: '',
      postalCode: '',
      contactPerson: '',
      contactPhone: '',
    },
    dropoff: {
      addressLine: '',
      locality: '',
      city: '',
      state: '',
      postalCode: '',
      contactPerson: '',
      contactPhone: '',
    },
    cargo: {
      name: '',
      category: 'Industrial Machinery & Equipment',
      weightKg: '',
      dimensions: {
        lengthFt: '',
        widthFt: '',
        heightFt: '',
      },
      packageCount: '1',
      packagingType: 'Corrugated Carton Boxes',
      isFragile: false,
      handlingInstructions: '',
    },
    requestedVehicleCategory: '',
    requestedPickupAt: '',
    specialInstructions: '',
  });

  // Client-generated idempotency key (stable for this form session until reset/submitted)
  const [idempotencyKey, setIdempotencyKey] = useState(() => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  });

  // UI Flow State
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [serverError, setServerError] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null);

  // Common Indian Cargo Categories
  const CARGO_CATEGORIES = [
    'Industrial Machinery & Equipment',
    'Fast Moving Consumer Goods (FMCG)',
    'Electronics & Electrical Appliances',
    'Automotive & Engineering Parts',
    'Building & Construction Materials',
    'Agricultural Produce & Grains',
    'Furniture, Fixtures & Fittings',
    'Textiles, Apparel & Fabrics',
    'Pharmaceuticals & Medical Goods',
    'General Commercial Freight',
  ];

  // Common Packaging Types
  const PACKAGING_TYPES = [
    'Corrugated Carton Boxes',
    'Wooden Crates & Cases',
    'Palletized & Shrink-Wrapped',
    'Steel / Plastic Drums & Barrels',
    'Gunny Bags / Sacks',
    'Heavy Metal Bundles / Coils',
    'Loose / Bulk Consignment',
  ];

  // Fetch Vehicle Categories
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError('');
      try {
        const res = await axios.get(`${baseUrl}/vehicles/categories`);
        if (res.data?.categories) {
          setCategories(res.data.categories);
          // Default selection if available
          if (res.data.categories.length > 0) {
            setFormData((prev) => ({
              ...prev,
              requestedVehicleCategory: prev.requestedVehicleCategory || res.data.categories[0]._id,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
        setCategoriesError('Could not load vehicle categories. Please verify your connection.');
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [baseUrl]);

  // Nested form handler
  const handleNestedChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setValidationErrors([]);
    setServerError('');
  };

  // Dimensions change handler with volume auto-calc
  const handleDimensionChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      cargo: {
        ...prev.cargo,
        dimensions: {
          ...prev.cargo.dimensions,
          [field]: value,
        },
      },
    }));
  };

  // Calculated cargo volume
  const calculatedVolume = () => {
    const l = parseFloat(formData.cargo.dimensions.lengthFt) || 0;
    const w = parseFloat(formData.cargo.dimensions.widthFt) || 0;
    const h = parseFloat(formData.cargo.dimensions.heightFt) || 0;
    if (l > 0 && w > 0 && h > 0) {
      return (l * w * h).toFixed(1);
    }
    return null;
  };

  // Step-by-step validator
  const validateStep = (step) => {
    const errs = [];
    if (step === 1) {
      if (!formData.pickup.addressLine.trim()) errs.push('Pickup street address / facility name is required');
      if (!formData.pickup.city.trim()) errs.push('Pickup city is required');
      if (!formData.pickup.state.trim()) errs.push('Pickup state is required');
      if (!/^[1-9][0-9]{5}$/.test(formData.pickup.postalCode.trim())) {
        errs.push('Pickup PIN code must be a valid 6-digit Indian postal code');
      }
      if (!formData.pickup.contactPerson.trim()) errs.push('Pickup contact person is required');
      if (!/^[6-9][0-9]{9}$/.test(formData.pickup.contactPhone.trim())) {
        errs.push('Pickup phone must be a valid 10-digit Indian mobile number');
      }
    } else if (step === 2) {
      if (!formData.dropoff.addressLine.trim()) errs.push('Delivery address / facility name is required');
      if (!formData.dropoff.city.trim()) errs.push('Delivery city is required');
      if (!formData.dropoff.state.trim()) errs.push('Delivery state is required');
      if (!/^[1-9][0-9]{5}$/.test(formData.dropoff.postalCode.trim())) {
        errs.push('Delivery PIN code must be a valid 6-digit Indian postal code');
      }
      if (!formData.dropoff.contactPerson.trim()) errs.push('Delivery contact person is required');
      if (!/^[6-9][0-9]{9}$/.test(formData.dropoff.contactPhone.trim())) {
        errs.push('Delivery phone must be a valid 10-digit Indian mobile number');
      }
    } else if (step === 3) {
      if (!formData.cargo.name.trim()) errs.push('Cargo name / description is required');
      const weight = parseFloat(formData.cargo.weightKg);
      if (!weight || weight <= 0 || weight > 40000) {
        errs.push('Cargo weight must be between 1 and 40,000 kg');
      }
      const packages = parseInt(formData.cargo.packageCount, 10);
      if (!packages || packages < 1) {
        errs.push('Package count must be at least 1 unit');
      }
      if (!formData.cargo.packagingType) errs.push('Packaging type must be selected');
    } else if (step === 4) {
      if (!formData.requestedVehicleCategory) {
        errs.push('Please select a commercial vehicle category');
      }
    } else if (step === 5) {
      if (!formData.requestedPickupAt) {
        errs.push('Requested pickup date and time is required');
      } else {
        const pickupDate = new Date(formData.requestedPickupAt);
        if (isNaN(pickupDate.getTime())) {
          errs.push('Please enter a valid pickup date and time');
        }
      }
    }
    setValidationErrors(errs);
    return errs.length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const handlePrevStep = () => {
    setValidationErrors([]);
    setServerError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Form Submission
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setServerError('');
    setValidationErrors([]);

    // Validate all steps
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Prepare payload
      const payload = {
        pickup: {
          addressLine: formData.pickup.addressLine.trim(),
          locality: formData.pickup.locality.trim(),
          city: formData.pickup.city.trim(),
          state: formData.pickup.state.trim(),
          postalCode: formData.pickup.postalCode.trim(),
          contactPerson: formData.pickup.contactPerson.trim(),
          contactPhone: formData.pickup.contactPhone.trim(),
        },
        dropoff: {
          addressLine: formData.dropoff.addressLine.trim(),
          locality: formData.dropoff.locality.trim(),
          city: formData.dropoff.city.trim(),
          state: formData.dropoff.state.trim(),
          postalCode: formData.dropoff.postalCode.trim(),
          contactPerson: formData.dropoff.contactPerson.trim(),
          contactPhone: formData.dropoff.contactPhone.trim(),
        },
        cargo: {
          name: formData.cargo.name.trim(),
          category: formData.cargo.category,
          weightKg: parseFloat(formData.cargo.weightKg),
          packageCount: parseInt(formData.cargo.packageCount, 10),
          packagingType: formData.cargo.packagingType,
          isFragile: Boolean(formData.cargo.isFragile),
          handlingInstructions: formData.cargo.handlingInstructions.trim(),
        },
        requestedVehicleCategory: formData.requestedVehicleCategory,
        requestedPickupAt: new Date(formData.requestedPickupAt).toISOString(),
        specialInstructions: formData.specialInstructions.trim(),
      };

      // Add dimensions if supplied
      const l = parseFloat(formData.cargo.dimensions.lengthFt);
      const w = parseFloat(formData.cargo.dimensions.widthFt);
      const h = parseFloat(formData.cargo.dimensions.heightFt);
      if (l > 0 && w > 0 && h > 0) {
        payload.cargo.dimensions = { lengthFt: l, widthFt: w, heightFt: h };
      }

      const res = await axios.post(`${baseUrl}/bookings`, payload, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (res.data?.booking) {
        setCreatedBooking(res.data.booking);
      }
    } catch (err) {
      console.error('Booking submission failed:', err);
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors.map((e) => e.msg || e.message));
      } else if (err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else {
        setServerError('Network or server error encountered while submitting cargo booking.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Selected category object
  const selectedCategoryObj = categories.find((c) => c._id === formData.requestedVehicleCategory);

  // Success Confirmation Screen
  if (createdBooking) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-6">
        <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl border border-emerald-500/30">
            <i className="ri-checkbox-circle-fill"></i>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Booking Request Received
          </span>
          <h2 className="text-2xl font-bold mt-4 text-white">Commercial Cargo Booking Created</h2>
          <p className="text-slate-400 text-sm mt-2">
            Your freight transportation request has been recorded and queued for commercial review and dispatch.
          </p>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-5 my-6 text-left space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs uppercase tracking-wider text-slate-400">Booking Reference</span>
              <span className="text-base font-mono font-bold text-amber-400">
                {createdBooking.bookingReference}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Booking Status</span>
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {createdBooking.bookingStatus}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Cargo</span>
              <span className="text-slate-200 font-medium">
                {createdBooking.cargo?.name} ({createdBooking.cargo?.weightKg} kg)
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Origin → Destination</span>
              <span className="text-slate-200 font-medium">
                {createdBooking.pickup?.city} → {createdBooking.dropoff?.city}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Pickup Schedule</span>
              <span className="text-slate-200 font-medium">
                {new Date(createdBooking.requestedPickupAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
              to="/my-bookings"
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-center shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <i className="ri-file-list-3-line"></i>
              <span>View My Bookings</span>
            </Link>
            <button
              onClick={() => {
                setCreatedBooking(null);
                setCurrentStep(1);
                setIdempotencyKey(
                  typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
                );
              }}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition text-center"
            >
              New Booking Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/home"
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
              title="Return to Dashboard"
            >
              <i className="ri-arrow-left-line text-lg"></i>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black tracking-wider text-lg">CARGORIDE</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                  Commercial Freight
                </span>
              </div>
              <p className="text-xs text-slate-400">Cargo Booking & Commercial Logistics Request</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/my-bookings"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2"
            >
              <i className="ri-truck-line text-amber-400 text-sm"></i>
              <span>My Bookings & Consignments</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full p-6 flex-1">
        {/* Step Indicator Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-400">
            <span className={currentStep >= 1 ? 'text-amber-400 font-bold' : ''}>1. Pickup</span>
            <span className={currentStep >= 2 ? 'text-amber-400 font-bold' : ''}>2. Delivery</span>
            <span className={currentStep >= 3 ? 'text-amber-400 font-bold' : ''}>3. Cargo</span>
            <span className={currentStep >= 4 ? 'text-amber-400 font-bold' : ''}>4. Vehicle</span>
            <span className={currentStep >= 5 ? 'text-amber-400 font-bold' : ''}>5. Schedule</span>
            <span className={currentStep >= 6 ? 'text-amber-400 font-bold' : ''}>6. Review</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Global Error Banner */}
        {serverError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <i className="ri-error-warning-line text-lg shrink-0 mt-0.5"></i>
            <div>
              <p className="font-semibold">Booking Error</p>
              <p className="text-xs text-rose-400/90 mt-1">{serverError}</p>
            </div>
          </div>
        )}

        {/* Validation Errors Box */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3">
            <i className="ri-alert-line text-lg shrink-0 mt-0.5"></i>
            <div className="flex-1">
              <p className="font-semibold">Please complete the required details:</p>
              <ul className="list-disc list-inside text-xs text-amber-200/90 mt-1 space-y-0.5">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmitBooking}>
            {/* STEP 1: PICKUP FACILITY */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-lg">
                    <i className="ri-map-pin-range-line"></i>
                    <span>Step 1: Origin & Pickup Location</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Provide the industrial warehouse, commercial depot, or premise where cargo will be collected.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Street Address / Industrial Estate / Warehouse *
                    </label>
                    <input
                      type="text"
                      value={formData.pickup.addressLine}
                      onChange={(e) => handleNestedChange('pickup', 'addressLine', e.target.value)}
                      placeholder="e.g. Unit 4, Sector 58, Industrial Model Township"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Locality / Landmark
                    </label>
                    <input
                      type="text"
                      value={formData.pickup.locality}
                      onChange={(e) => handleNestedChange('pickup', 'locality', e.target.value)}
                      placeholder="e.g. Near Toll Plaza"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      6-Digit Indian PIN Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.pickup.postalCode}
                      onChange={(e) => handleNestedChange('pickup', 'postalCode', e.target.value)}
                      placeholder="e.g. 122001"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">City *</label>
                    <input
                      type="text"
                      value={formData.pickup.city}
                      onChange={(e) => handleNestedChange('pickup', 'city', e.target.value)}
                      placeholder="e.g. Gurugram"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">State *</label>
                    <input
                      type="text"
                      value={formData.pickup.state}
                      onChange={(e) => handleNestedChange('pickup', 'state', e.target.value)}
                      placeholder="e.g. Haryana"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Site Contact Person *
                    </label>
                    <input
                      type="text"
                      value={formData.pickup.contactPerson}
                      onChange={(e) => handleNestedChange('pickup', 'contactPerson', e.target.value)}
                      placeholder="e.g. Rajesh Kumar (Warehouse Supervisor)"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      10-Digit Mobile Number *
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formData.pickup.contactPhone}
                      onChange={(e) => handleNestedChange('pickup', 'contactPhone', e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DELIVERY / DROPOFF FACILITY */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-lg">
                    <i className="ri-map-pin-user-line"></i>
                    <span>Step 2: Delivery & Consignee Location</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Specify the destination commercial facility, factory, or warehouse receiving the freight.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Street Address / Consignee Facility *
                    </label>
                    <input
                      type="text"
                      value={formData.dropoff.addressLine}
                      onChange={(e) => handleNestedChange('dropoff', 'addressLine', e.target.value)}
                      placeholder="e.g. Plot 12, Phase II, Okhla Industrial Area"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Locality / Landmark
                    </label>
                    <input
                      type="text"
                      value={formData.dropoff.locality}
                      onChange={(e) => handleNestedChange('dropoff', 'locality', e.target.value)}
                      placeholder="e.g. Near Container Depot"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      6-Digit Indian PIN Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.dropoff.postalCode}
                      onChange={(e) => handleNestedChange('dropoff', 'postalCode', e.target.value)}
                      placeholder="e.g. 110020"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">City *</label>
                    <input
                      type="text"
                      value={formData.dropoff.city}
                      onChange={(e) => handleNestedChange('dropoff', 'city', e.target.value)}
                      placeholder="e.g. New Delhi"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">State *</label>
                    <input
                      type="text"
                      value={formData.dropoff.state}
                      onChange={(e) => handleNestedChange('dropoff', 'state', e.target.value)}
                      placeholder="e.g. Delhi"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Receiving Incharge / Contact Person *
                    </label>
                    <input
                      type="text"
                      value={formData.dropoff.contactPerson}
                      onChange={(e) => handleNestedChange('dropoff', 'contactPerson', e.target.value)}
                      placeholder="e.g. Amit Sharma (Receiving Manager)"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      10-Digit Mobile Number *
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formData.dropoff.contactPhone}
                      onChange={(e) => handleNestedChange('dropoff', 'contactPhone', e.target.value)}
                      placeholder="e.g. 9123456789"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CARGO SPECIFICATIONS */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-fade-in">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-lg">
                    <i className="ri-archive-line"></i>
                    <span>Step 3: Cargo Information & Weight</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Provide precise weight, dimensions, and handling requirements. Volume and weight are handled separately.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Cargo Description / Consignment Name *
                    </label>
                    <input
                      type="text"
                      value={formData.cargo.name}
                      onChange={(e) => handleNestedChange('cargo', 'name', e.target.value)}
                      placeholder="e.g. Industrial Hydraulic Valves & Pump Assemblies"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Cargo Category / Commodity *
                    </label>
                    <select
                      value={formData.cargo.category}
                      onChange={(e) => handleNestedChange('cargo', 'category', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-sm"
                    >
                      {CARGO_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Total Weight (in Kilograms) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="40000"
                        step="any"
                        value={formData.cargo.weightKg}
                        onChange={(e) => handleNestedChange('cargo', 'weightKg', e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm font-mono"
                      />
                      <span className="absolute right-4 top-2.5 text-xs font-semibold text-slate-400">KG</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Quantity / Package Count *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.cargo.packageCount}
                      onChange={(e) => handleNestedChange('cargo', 'packageCount', e.target.value)}
                      placeholder="e.g. 24"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Packaging Type *
                    </label>
                    <select
                      value={formData.cargo.packagingType}
                      onChange={(e) => handleNestedChange('cargo', 'packagingType', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-sm"
                    >
                      {PACKAGING_TYPES.map((pkg) => (
                        <option key={pkg} value={pkg}>
                          {pkg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dimensions Box */}
                  <div className="sm:col-span-2 p-4 bg-slate-800/50 border border-slate-700/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Consignment Dimensions (Feet) - Optional
                      </span>
                      {calculatedVolume() && (
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Est. Volume: {calculatedVolume()} cu. ft
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Length (ft)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.cargo.dimensions.lengthFt}
                          onChange={(e) => handleDimensionChange('lengthFt', e.target.value)}
                          placeholder="e.g. 8.5"
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Width (ft)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.cargo.dimensions.widthFt}
                          onChange={(e) => handleDimensionChange('widthFt', e.target.value)}
                          placeholder="e.g. 5.0"
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          Height (ft)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.cargo.dimensions.heightFt}
                          onChange={(e) => handleDimensionChange('heightFt', e.target.value)}
                          placeholder="e.g. 6.0"
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="fragile-check"
                      checked={formData.cargo.isFragile}
                      onChange={(e) => handleNestedChange('cargo', 'isFragile', e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="fragile-check" className="text-xs text-slate-300 font-medium cursor-pointer">
                      Fragile / High-Care Consignment (Requires shock-mitigation & secure lashing)
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Special Handling Requirements (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.cargo.handlingInstructions}
                      onChange={(e) => handleNestedChange('cargo', 'handlingInstructions', e.target.value)}
                      placeholder="e.g. Keep upright, do not double-stack pallets, requires tarpaulin cover"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: COMMERCIAL VEHICLE CATEGORY */}
            {currentStep === 4 && (
              <div className="space-y-5 animate-fade-in">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-lg">
                    <i className="ri-truck-line"></i>
                    <span>Step 4: Preferred Commercial Vehicle Category</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Select the commercial vehicle category suitable for your consignment payload and deck capacity.
                  </p>
                </div>

                {categoriesLoading ? (
                  <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-3">
                    <i className="ri-loader-4-line animate-spin text-2xl text-amber-400"></i>
                    <span>Loading verified vehicle categories...</span>
                  </div>
                ) : categoriesError ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                    {categoriesError}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((cat) => {
                      const isSelected = formData.requestedVehicleCategory === cat._id;
                      return (
                        <div
                          key={cat._id}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              requestedVehicleCategory: cat._id,
                            }));
                            setValidationErrors([]);
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                              : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-100">{cat.name}</span>
                                {isSelected && (
                                  <i className="ri-checkbox-circle-fill text-amber-400 text-base"></i>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400 uppercase">
                                Code: {cat.code}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                              Max {cat.payloadCapacityKg} kg
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 mt-2 line-clamp-2">{cat.description}</p>

                          <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                            <div>
                              <span className="text-slate-400">Deck:</span>{' '}
                              <span className="font-mono">
                                {cat.dimensions?.lengthFt} x {cat.dimensions?.widthFt} x{' '}
                                {cat.dimensions?.heightFt} ft
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Volume:</span>{' '}
                              <span className="font-mono">{cat.volumeCapacityCuFt} cu. ft</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: PICKUP SCHEDULE & SPECIAL INSTRUCTIONS */}
            {currentStep === 5 && (
              <div className="space-y-5 animate-fade-in">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-lg">
                    <i className="ri-calendar-event-line"></i>
                    <span>Step 5: Pickup Schedule & Commercial Instructions</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Set requested loading dock arrival time and warehouse entry instructions.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Requested Pickup Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.requestedPickupAt}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          requestedPickupAt: e.target.value,
                        }));
                        setValidationErrors([]);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-400 text-sm font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Choose when the commercial carrier should report to the loading bay.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Commercial Gate / Dock Instructions (Optional)
                    </label>
                    <textarea
                      rows="4"
                      value={formData.specialInstructions}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          specialInstructions: e.target.value,
                        }));
                      }}
                      placeholder="e.g. Enter through Gate No. 3. Vehicle height cannot exceed 12 feet. Transporter must carry company authorization letter and GST e-way bill copy."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW & SUBMIT */}
            {currentStep === 6 && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-lg">
                    <i className="ri-file-check-line"></i>
                    <span>Step 6: Review & Submit Commercial Request</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Verify all consignment details. Submitting this request creates an official cargo booking request on CargoRide.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Origin Card */}
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold">
                      <i className="ri-map-pin-2-fill"></i>
                      <span>Origin (Pickup)</span>
                    </div>
                    <p className="text-slate-200 font-medium">{formData.pickup.addressLine}</p>
                    {formData.pickup.locality && (
                      <p className="text-slate-400">{formData.pickup.locality}</p>
                    )}
                    <p className="text-slate-300">
                      {formData.pickup.city}, {formData.pickup.state} -{' '}
                      <span className="font-mono">{formData.pickup.postalCode}</span>
                    </p>
                    <p className="text-slate-400 pt-1 border-t border-slate-700/60">
                      Contact: {formData.pickup.contactPerson} ({formData.pickup.contactPhone})
                    </p>
                  </div>

                  {/* Destination Card */}
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <i className="ri-flag-2-fill"></i>
                      <span>Destination (Delivery)</span>
                    </div>
                    <p className="text-slate-200 font-medium">{formData.dropoff.addressLine}</p>
                    {formData.dropoff.locality && (
                      <p className="text-slate-400">{formData.dropoff.locality}</p>
                    )}
                    <p className="text-slate-300">
                      {formData.dropoff.city}, {formData.dropoff.state} -{' '}
                      <span className="font-mono">{formData.dropoff.postalCode}</span>
                    </p>
                    <p className="text-slate-400 pt-1 border-t border-slate-700/60">
                      Contact: {formData.dropoff.contactPerson} ({formData.dropoff.contactPhone})
                    </p>
                  </div>

                  {/* Cargo Card */}
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-sky-400 font-semibold">
                      <i className="ri-archive-line"></i>
                      <span>Cargo Specifications</span>
                    </div>
                    <p className="text-slate-200 font-medium">{formData.cargo.name}</p>
                    <p className="text-slate-400">Category: {formData.cargo.category}</p>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-700/60">
                      <span className="text-slate-400">Weight:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {formData.cargo.weightKg} kg
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Packages:</span>
                      <span className="text-slate-200 font-medium">
                        {formData.cargo.packageCount} ({formData.cargo.packagingType})
                      </span>
                    </div>
                    {formData.cargo.isFragile && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Fragile Consignment
                      </span>
                    )}
                  </div>

                  {/* Vehicle & Schedule Card */}
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-semibold">
                      <i className="ri-truck-line"></i>
                      <span>Vehicle & Schedule</span>
                    </div>
                    <p className="text-slate-200 font-medium">
                      {selectedCategoryObj?.name || 'Selected Category'}
                    </p>
                    <p className="text-slate-400">
                      Payload Cap: {selectedCategoryObj?.payloadCapacityKg} kg
                    </p>
                    <div className="pt-1 border-t border-slate-700/60">
                      <span className="text-slate-400">Pickup At:</span>
                      <p className="font-mono font-semibold text-slate-200 mt-0.5">
                        {formData.requestedPickupAt
                          ? new Date(formData.requestedPickupAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>

                {formData.specialInstructions && (
                  <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/60 text-xs">
                    <span className="font-semibold text-slate-400 block mb-1">Gate / Dock Instructions:</span>
                    <p className="text-slate-300">{formData.specialInstructions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation & Submission Controls */}
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <i className="ri-arrow-left-s-line text-sm"></i>
                  <span>Previous</span>
                </button>
              ) : (
                <div></div>
              )}

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <span>Continue</span>
                  <i className="ri-arrow-right-s-line text-sm"></i>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  {submitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base"></i>
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line text-base"></i>
                      <span>Confirm & Submit Booking</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BookCargo;
