// Overpass API integration for fetching fuel station details from OpenStreetMap
import { parseCoordinates } from './distance';

// Cache for OSM data to minimize API calls
const osmCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Query Overpass API for fuel stations in a bounding box
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radius - Search radius in meters (default 10000m = 10km)
 */
export const fetchOSMFuelStations = async (lat, lon, radius = 10000) => {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  
  // Check cache first
  const cached = osmCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Overpass query to find fuel stations around coordinates
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="fuel"](around:${radius},${lat},${lon});
        way["amenity"="fuel"](around:${radius},${lat},${lon});
      );
      out body center;
    `;

    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Process OSM elements
    const stations = data.elements.map(element => {
      const tags = element.tags || {};
      const coords = element.center || { lat: element.lat, lon: element.lon };
      
      return {
        osmId: element.id,
        lat: coords.lat,
        lon: coords.lon,
        brand: tags.brand || tags['brand:wikidata'] || null,
        name: tags.name || null,
        operator: tags.operator || null,
        ref: tags.ref || null,
        // Common brand mappings
        displayName: tags.brand || tags.operator || tags.name || null
      };
    });

    // Cache the results
    osmCache.set(cacheKey, {
      data: stations,
      timestamp: Date.now()
    });

    return stations;
  } catch (error) {
    console.error('Error fetching OSM data:', error);
    return [];
  }
};

/**
 * Match government API stations with OSM data by coordinates
 * @param {Array} apiStations - Stations from French government API
 * @param {number} centerLat - Search center latitude
 * @param {number} centerLon - Search center longitude
 */
export const enrichStationsWithBrands = async (apiStations, centerLat, centerLon) => {
  if (!apiStations || apiStations.length === 0) {
    return apiStations;
  }

  try {
    // Fetch OSM stations around the center point
    const osmStations = await fetchOSMFuelStations(centerLat, centerLon);
    
    if (osmStations.length === 0) {
      console.log('No OSM stations found in area');
      return apiStations;
    }

    // Match API stations with OSM stations by proximity
    const enrichedStations = apiStations.map(station => {
      const coords = parseCoordinates(station);
      if (!coords) return station;

      // Find closest OSM station (within 100m)
      let closestOSM = null;
      let minDistance = Infinity;

      osmStations.forEach(osmStation => {
        const distance = calculateDistanceMeters(
          coords.lat, coords.lon,
          osmStation.lat, osmStation.lon
        );

        // Only match if within 100 meters (same station)
        if (distance < 100 && distance < minDistance) {
          minDistance = distance;
          closestOSM = osmStation;
        }
      });

      // Add brand info if matched
      if (closestOSM && closestOSM.displayName) {
        return {
          ...station,
          brand: closestOSM.displayName,
          brandSource: 'osm'
        };
      }

      return station;
    });

    const matchCount = enrichedStations.filter(s => s.brand).length;
    console.log(`Matched ${matchCount}/${apiStations.length} stations with OSM brands`);

    return enrichedStations;
  } catch (error) {
    console.error('Error enriching stations:', error);
    return apiStations;
  }
};

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
