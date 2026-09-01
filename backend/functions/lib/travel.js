"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.haversineKm = haversineKm;
exports.estimateTravelBufferMinutes = estimateTravelBufferMinutes;
/** Great-circle distance in km between two points (Haversine formula). */
function haversineKm(a, b) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}
/**
 * Estimated one-way travel time between two client addresses, used as the minimum gap a
 * provider needs between two home-visit bookings. Assumes ~25km/h average travel speed (local
 * roads/traffic, not motorway) — a deliberately conservative straight-line estimate, not routed
 * against real roads. Clamped to [10, 90] minutes: a very close pair of addresses still gets
 * some buffer (packing up, parking, etc.), and a very far pair doesn't demand an unreasonable
 * gap that would make the availability grid useless.
 */
function estimateTravelBufferMinutes(distanceKm) {
    const AVERAGE_SPEED_KMH = 25;
    const minutes = (distanceKm / AVERAGE_SPEED_KMH) * 60;
    return Math.min(90, Math.max(10, Math.round(minutes)));
}
//# sourceMappingURL=travel.js.map