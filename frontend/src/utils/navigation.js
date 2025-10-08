// Navigation utility functions for opening maps apps

/**
 * Generate navigation URLs for different map applications
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} label - Location label (optional)
 */
export const getNavigationUrls = (lat, lon, label = '') => {
  const encodedLabel = encodeURIComponent(label);
  
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${encodedLabel}`,
    apple: `http://maps.apple.com/?daddr=${lat},${lon}&q=${encodedLabel}`,
    waze: `https://waze.com/ul?ll=${lat},${lon}&navigate=yes&q=${encodedLabel}`,
    // Generic link that works on most platforms
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
  };
};

/**
 * Open navigation to a location
 * Uses platform detection to open the best app
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} label - Location label
 */
export const navigateToStation = (lat, lon, label = '') => {
  const urls = getNavigationUrls(lat, lon, label);
  
  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  let url = urls.default;
  
  // Use Apple Maps on iOS devices
  if (isIOS) {
    url = urls.apple;
  }
  // Use Google Maps on Android
  else if (isAndroid) {
    url = urls.google;
  }
  
  // Open in new window/tab
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Get address string for a station
 */
export const getStationAddress = (station) => {
  return `${station.adresse}, ${station.ville} ${station.cp}`;
};
