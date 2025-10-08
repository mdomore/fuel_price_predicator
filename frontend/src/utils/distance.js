// Calculate distance between two coordinates using Haversine formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in km
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Parse coordinates from API (latitude and longitude are often in different formats)
export const parseCoordinates = (station) => {
  // API returns geom array [lat, lon] or latitude/longitude strings
  if (station.geom && Array.isArray(station.geom)) {
    return {
      lat: station.geom[0],
      lon: station.geom[1]
    };
  }
  
  // Fallback to latitude/longitude strings (might be in format "4581675" = 45.81675)
  if (station.latitude && station.longitude) {
    return {
      lat: parseFloat(station.latitude) / 100000,
      lon: parseFloat(station.longitude) / 100000
    };
  }
  
  return null;
};

// Sort stations by distance from a reference point
export const sortByDistance = (stations, refLat, refLon) => {
  return stations
    .map(station => {
      const coords = parseCoordinates(station);
      if (!coords) return { ...station, distance: Infinity };
      
      const distance = calculateDistance(refLat, refLon, coords.lat, coords.lon);
      return { ...station, distance };
    })
    .sort((a, b) => a.distance - b.distance);
};
