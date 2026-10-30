/**
 * Haversine formula for genuine geographic distance calculation (in kilometers)
 */
const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Rank eligible commercial freight vehicles for a dispatch job.
 *
 * Ranking criteria:
 * 1. Trustworthy Geographic Proximity: If valid genuine GPS coordinates exist for both
 *    the pickup location and the transporter/vehicle, rank by shortest distance.
 * 2. Capacity Fit Factor: If coordinates are absent (or tied), rank by best capacity utilization
 *    (payload capacity closest to required cargo weight to avoid wasted commercial capacity).
 * 3. Deterministic Operational Ordering: Vehicles with newest verified readiness.
 *
 * @param {Array} eligibleVehicles - List of eligible vehicle documents with populated transporter
 * @param {Object} pickupLocation - Pickup location snapshot containing optional coordinates
 * @param {Object} cargoRequirements - Cargo payload specifications
 * @returns {Array} Ranked array of vehicles with attached ranking metadata
 */
const rankEligibleVehicles = (eligibleVehicles, pickupLocation = {}, cargoRequirements = {}) => {
  if (!Array.isArray(eligibleVehicles) || eligibleVehicles.length === 0) {
    return [];
  }

  const pickupLat = pickupLocation.coordinates?.latitude;
  const pickupLon = pickupLocation.coordinates?.longitude;
  const hasPickupCoords =
    typeof pickupLat === 'number' &&
    typeof pickupLon === 'number' &&
    !isNaN(pickupLat) &&
    !isNaN(pickupLon);

  const requiredPayload = Number(cargoRequirements.requiredPayloadKg) || 1;

  const scoredVehicles = eligibleVehicles.map((vehicle) => {
    let proximityKm = null;
    let hasGenuineProximity = false;

    // Check transporter location coordinates
    const transporterLoc = vehicle.transporter?.location;
    if (hasPickupCoords && transporterLoc) {
      const transLat = transporterLoc.lat ?? transporterLoc.latitude;
      const transLng = transporterLoc.lng ?? transporterLoc.longitude;

      if (
        typeof transLat === 'number' &&
        typeof transLng === 'number' &&
        !isNaN(transLat) &&
        !isNaN(transLng)
      ) {
        proximityKm = calculateHaversineDistanceKm(pickupLat, pickupLon, transLat, transLng);
        hasGenuineProximity = true;
      }
    }

    // Capacity fit ratio: (vehiclePayload / requiredPayload). Closer to 1.0 means ideal sizing.
    const capacityRatio = Math.max(1, (vehicle.payloadCapacityKg || requiredPayload) / requiredPayload);

    return {
      vehicle,
      rankingMetadata: {
        hasGenuineProximity,
        proximityKm,
        capacityRatio,
        payloadCapacityKg: vehicle.payloadCapacityKg,
      },
    };
  });

  // Sort: First by proximity if available, then by capacity ratio (smallest surplus first), then createdAt
  scoredVehicles.sort((a, b) => {
    // Both have genuine proximity
    if (a.rankingMetadata.hasGenuineProximity && b.rankingMetadata.hasGenuineProximity) {
      if (a.rankingMetadata.proximityKm !== b.rankingMetadata.proximityKm) {
        return a.rankingMetadata.proximityKm - b.rankingMetadata.proximityKm;
      }
    } else if (a.rankingMetadata.hasGenuineProximity && !b.rankingMetadata.hasGenuineProximity) {
      return -1; // Prioritize vehicle with genuine verified proximity
    } else if (!a.rankingMetadata.hasGenuineProximity && b.rankingMetadata.hasGenuineProximity) {
      return 1;
    }

    // Secondary: Capacity fit ratio (minimize excess payload wastage)
    if (a.rankingMetadata.capacityRatio !== b.rankingMetadata.capacityRatio) {
      return a.rankingMetadata.capacityRatio - b.rankingMetadata.capacityRatio;
    }

    // Tertiary: Stable tie-breaker
    return String(a.vehicle._id).localeCompare(String(b.vehicle._id));
  });

  return scoredVehicles.map((item) => ({
    ...item.vehicle,
    rankingMetadata: item.rankingMetadata,
  }));
};

module.exports = {
  calculateHaversineDistanceKm,
  rankEligibleVehicles,
};
