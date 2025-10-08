import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Box, Typography, Chip } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { parseCoordinates } from '../utils/distance';

// Fix Leaflet default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Create icon instances once (not on every render)
const defaultIcon = new L.Icon.Default();
const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map centering
function MapUpdater({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  
  return null;
}

const StationMap = ({ stations, selectedFuelType, onStationClick, mapCenter, userLocation, selectedStation }) => {
  const [center, setCenter] = useState([46.603354, 1.888334]); // Center of France
  const [zoom, setZoom] = useState(6);

  useEffect(() => {
    if (mapCenter) {
      setCenter(mapCenter);
      setZoom(14);
    } else if (userLocation) {
      setCenter(userLocation);
      setZoom(12);
    } else if (stations.length > 0) {
      // Center on first station with coordinates
      const firstStation = stations.find(s => parseCoordinates(s));
      if (firstStation) {
        const coords = parseCoordinates(firstStation);
        setCenter([coords.lat, coords.lon]);
        setZoom(10);
      }
    }
  }, [mapCenter, userLocation, stations]);

  const handleMarkerClick = (station) => {
    if (onStationClick) {
      onStationClick(station);
    }
  };

  return (
    <Box sx={{ height: { xs: '400px', sm: '500px', md: '600px' }, width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapUpdater center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {stations.map((station, index) => {
          const coords = parseCoordinates(station);
          if (!coords) return null;

          const fuelPrice = station[`${selectedFuelType?.toLowerCase()}_prix`];
          const isSelected = selectedStation && 
            station.adresse === selectedStation.adresse && 
            station.cp === selectedStation.cp;
          
          // Use pre-created icon instances
          const markerIcon = isSelected ? selectedIcon : defaultIcon;
          
          // Create unique key using station info
          const markerKey = `${station.cp}-${station.adresse}-${index}`;
          
          return (
            <Marker
              key={markerKey}
              position={[coords.lat, coords.lon]}
              icon={markerIcon}
              eventHandlers={{
                click: () => handleMarkerClick(station),
              }}
            >
              <Popup>
                <Box sx={{ minWidth: 200 }}>
                  {station.brand && (
                    <Typography variant="subtitle2" color="primary" fontWeight="bold">
                      {station.brand}
                    </Typography>
                  )}
                  <Typography variant="subtitle1" fontWeight="bold">
                    {station.ville} - {station.adresse}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {station.cp} {station.ville}
                    {station.pop && ` • ${station.pop === 'R' ? 'Route' : 'Autoroute'}`}
                  </Typography>
                  {station.id && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Station ID: {station.id}
                    </Typography>
                  )}
                  
                  {fuelPrice && (
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        label={`${selectedFuelType}: ${fuelPrice}€`} 
                        color="primary" 
                        size="small"
                      />
                    </Box>
                  )}
                  
                  {station.distance !== undefined && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Distance: {station.distance.toFixed(2)} km
                    </Typography>
                  )}
                  
                  {station.carburants_disponibles && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Available: {Array.isArray(station.carburants_disponibles) 
                          ? station.carburants_disponibles.join(', ')
                          : station.carburants_disponibles}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Popup>
            </Marker>
          );
        })}
        
        {userLocation && (
          <Marker 
            key="user-location"
            position={userLocation}
            icon={userLocationIcon}
          >
            <Popup>
              <Typography variant="body2">Your Location</Typography>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </Box>
  );
};

export default StationMap;
