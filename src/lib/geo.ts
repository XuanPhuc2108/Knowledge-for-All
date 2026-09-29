const EARTH_RADIUS_M = 6371000

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.round(meters / 50) * 50
    return `khoảng ${rounded} m`
  }
  const km = Math.round((meters / 1000) * 10) / 10
  return `khoảng ${km} km`
}

export function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleRad: number,
): { x: number; y: number } {
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  }
}
