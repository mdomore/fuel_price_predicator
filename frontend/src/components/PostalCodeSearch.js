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

  const handleSearch = async () => {
    setError('Searching...');
    
    if (!postalCode || postalCode.length !== 5) {
      setError('Please enter a valid 5-digit postal code');
      return;
    }

    try {
      // First, try to find stations in this postal code
      const matchingStations = allStations.filter(
        station => station.cp === postalCode
      );

      let centerLat, centerLon;

      if (matchingStations.length > 0) {
        // Use first station's coordinates as center
        const stationsWithCoords = matchingStations.filter(s => parseCoordinates(s));
        if (stationsWithCoords.length > 0) {
          const coords = parseCoordinates(stationsWithCoords[0]);
          centerLat = coords.lat;
          centerLon = coords.lon;
        }
      }

      // If no stations in this postal code, geocode it using French government API
      if (!centerLat) {
        const response = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=centre&format=json&geometry=centre`
        );
        
        if (!response.ok) {
          throw new Error('Failed to geocode postal code');
        }

        const communes = await response.json();
        
        if (!communes || communes.length === 0) {
          setError(`Postal code ${postalCode} not found`);
          setSearchResults([]);
          return;
        }

        // Use first commune's center coordinates
        centerLat = communes[0].centre.coordinates[1];
        centerLon = communes[0].centre.coordinates[0];
      }

      setError('');
      
      // Sort all stations by distance from postal code center
      let sorted = sortByDistance(allStations, centerLat, centerLon);
      
      // Filter by fuel type and sort by price
      const fuelPriceField = `${selectedFuelType?.toLowerCase()}_prix`;
      sorted = sorted
        .filter(s => s[fuelPriceField] != null && s[fuelPriceField] !== '')
        .sort((a, b) => {
          // First by price (ascending)
          const priceDiff = (a[fuelPriceField] || 999) - (b[fuelPriceField] || 999);
          if (Math.abs(priceDiff) > 0.001) return priceDiff;
          // Then by distance
          return a.distance - b.distance;
        });
      
      // Take closest 10 stations
      const nearest = sorted.slice(0, 10);
      setSearchResults(nearest);

      // Notify parent component about the location
      if (onLocationFound) {
        onLocationFound({
          lat: centerLat,
          lon: centerLon,
          postalCode,
          stations: nearest
        });
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      setSearchResults([]);
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
        
        // Sort stations by distance from user location, then by price
        let sorted = sortByDistance(allStations, latitude, longitude);
        
        // Filter by fuel type and sort by price
        const fuelPriceField = `${selectedFuelType?.toLowerCase()}_prix`;
        sorted = sorted
          .filter(s => s[fuelPriceField] != null && s[fuelPriceField] !== '')
          .sort((a, b) => {
            // First by price (ascending)
            const priceDiff = (a[fuelPriceField] || 999) - (b[fuelPriceField] || 999);
            if (Math.abs(priceDiff) > 0.001) return priceDiff;
            // Then by distance
            return a.distance - b.distance;
          });
        
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
