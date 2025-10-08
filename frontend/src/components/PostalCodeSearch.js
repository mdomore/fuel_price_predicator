import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { sortByDistance, parseCoordinates } from '../utils/distance';

const PostalCodeSearch = ({ allStations, selectedFuelType, onLocationFound, onUseMyLocation }) => {
  const [postalCode, setPostalCode] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = () => {
    setError('');
    
    if (!postalCode || postalCode.length !== 5) {
      setError('Please enter a valid 5-digit postal code');
      return;
    }

    // Filter stations by postal code
    const matchingStations = allStations.filter(
      station => station.cp === postalCode
    );

    if (matchingStations.length === 0) {
      setError(`No stations found for postal code ${postalCode}`);
      setSearchResults([]);
      return;
    }

    // Get center coordinates from matching stations
    const stationsWithCoords = matchingStations.filter(s => parseCoordinates(s));
    if (stationsWithCoords.length === 0) {
      setError('No location data available for stations in this postal code');
      return;
    }

    const firstCoords = parseCoordinates(stationsWithCoords[0]);
    
    // Sort all stations by distance from this postal code's center
    const sorted = sortByDistance(allStations, firstCoords.lat, firstCoords.lon);
    
    // Take closest 10 stations
    const nearest = sorted.slice(0, 10);
    setSearchResults(nearest);

    // Notify parent component about the location
    if (onLocationFound) {
      onLocationFound({
        lat: firstCoords.lat,
        lon: firstCoords.lon,
        postalCode,
        stations: nearest
      });
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError('Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setError('');
        
        // Sort stations by distance from user location
        const sorted = sortByDistance(allStations, latitude, longitude);
        const nearest = sorted.slice(0, 10);
        setSearchResults(nearest);

        // Notify parent component
        if (onUseMyLocation) {
          onUseMyLocation({
            lat: latitude,
            lon: longitude,
            stations: nearest
          });
        }
      },
      (error) => {
        setError(`Error getting location: ${error.message}`);
      }
    );
  };

  const fuelPriceField = `${selectedFuelType?.toLowerCase()}_prix`;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Find Nearby Stations
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
        <TextField
          label="Postal Code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="75001"
          inputProps={{ maxLength: 5, pattern: '[0-9]*' }}
          sx={{ width: 200 }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
        >
          Search
        </Button>
        <Button
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={handleUseMyLocation}
        >
          Use My Location
        </Button>
      </Box>

      {error && (
        <Typography color={error.includes('Getting') ? 'info.main' : 'error'} sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {searchResults.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            {searchResults.length} Nearest Stations
          </Typography>
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {searchResults.map((station, index) => {
              const fuelPrice = station[fuelPriceField];
              return (
                <React.Fragment key={index}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1">
                            {station.nom || station.adresse}
                          </Typography>
                          {fuelPrice && (
                            <Chip
                              label={`${fuelPrice}€`}
                              color="primary"
                              size="small"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {station.adresse}, {station.ville} ({station.cp})
                          </Typography>
                          {station.distance !== undefined && (
                            <Typography variant="caption" color="primary" fontWeight="bold">
                              {station.distance.toFixed(2)} km away
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                  {index < searchResults.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </>
      )}
    </Paper>
  );
};

export default PostalCodeSearch;
