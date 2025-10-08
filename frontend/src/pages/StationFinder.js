import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import StationMap from '../components/StationMap';
import PostalCodeSearch from '../components/PostalCodeSearch';

const API_URL = '/api/fuel-prices';

const StationFinder = () => {
  const [fuelType, setFuelType] = useState('Gazole');
  const [fuelStations, setFuelStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyStations, setNearbyStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);

  const fuelTypes = [
    { value: 'Gazole', label: 'Diesel (Gazole)' },
    { value: 'SP95', label: 'SP95' },
    { value: 'SP98', label: 'SP98' },
    { value: 'E10', label: 'SP95-E10' },
    { value: 'GPLc', label: 'GPL' }
  ];

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data?.records) {
        const stations = data.records.map(record => {
          const fields = record.fields;
          if (fields.carburants_disponibles && typeof fields.carburants_disponibles === 'string') {
            fields.carburants_disponibles = fields.carburants_disponibles.split(',').map(f => f.trim());
          }
          return fields;
        });
        setFuelStations(stations);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching stations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const handleFuelTypeChange = (event) => {
    setFuelType(event.target.value);
  };

  const handleLocationFound = (location) => {
    setMapCenter([location.lat, location.lon]);
    setUserLocation(null);
    setNearbyStations(location.stations || []);
  };

  const handleUseMyLocation = (location) => {
    setUserLocation([location.lat, location.lon]);
    setMapCenter([location.lat, location.lon]);
    setNearbyStations(location.stations || []);
  };

  const handleStationClick = (station, coords) => {
    setSelectedStation(station);
    setMapCenter([coords.lat, coords.lon]);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Find Fuel Stations
        </Typography>

        {/* Fuel Type Selector */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>Fuel Type</InputLabel>
            <Select
              value={fuelType}
              label="Fuel Type"
              onChange={handleFuelTypeChange}
            >
              {fuelTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Postal Code Search & Nearby Stations */}
            <Grid item xs={12} md={5}>
              <PostalCodeSearch
                allStations={fuelStations}
                selectedFuelType={fuelType}
                onLocationFound={handleLocationFound}
                onUseMyLocation={handleUseMyLocation}
                onStationClick={handleStationClick}
              />
            </Grid>

            {/* Interactive Map */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h5" component="h2" gutterBottom align="center">
                  Station Map
                </Typography>
                <StationMap
                  stations={nearbyStations.length > 0 ? nearbyStations : fuelStations}
                  selectedFuelType={fuelType}
                  onStationClick={handleStationClick}
                  mapCenter={mapCenter}
                  userLocation={userLocation}
                  selectedStation={selectedStation}
                />
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default StationFinder;
