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
  Chip,
  ListItemButton,
  IconButton,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsIcon from '@mui/icons-material/Directions';
import { sortByDistance, parseCoordinates } from '../utils/distance';
import { enrichStationsWithBrands } from '../utils/overpass';
import { navigateToStation, getStationAddress } from '../utils/navigation';

const PostalCodeSearch = ({ allStations, selectedFuelType, onLocationFound, onUseMyLocation, onStationClick }) => {
  const [postalCode, setPostalCode] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  const [loadingBrands, setLoadingBrands] = useState(false);

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
      
      // Filter by fuel type and distance (max 50km)
      const fuelPriceField = `${selectedFuelType?.toLowerCase()}_prix`;
      const MAX_DISTANCE_KM = 50;
      
      sorted = sorted.filter(s => 
        s[fuelPriceField] != null && 
        s[fuelPriceField] !== '' && 
        s.distance <= MAX_DISTANCE_KM
      );

      // If not enough stations within 50km, try 100km
      if (sorted.length < 5) {
        sorted = sortByDistance(allStations, centerLat, centerLon)
          .filter(s => 
            s[fuelPriceField] != null && 
            s[fuelPriceField] !== '' && 
            s.distance <= 100
          );
      }

      // Sort by distance first (closest stations), then by price
      sorted = sorted.sort((a, b) => {
        // First by distance (keep it reasonable)
        const distDiff = a.distance - b.distance;
        if (Math.abs(distDiff) > 5) return distDiff; // Significant distance difference
        // Then by price if stations are close to each other
        return (a[fuelPriceField] || 999) - (b[fuelPriceField] || 999);
      });
      
      // Take closest 10 stations
      const nearest = sorted.slice(0, 10);
      setSearchResults(nearest);

      // Enrich with brand names from OSM (in background)
      setLoadingBrands(true);
      enrichStationsWithBrands(nearest, centerLat, centerLon)
        .then(enriched => {
          setSearchResults(enriched);
          setLoadingBrands(false);
          
          // Update parent with enriched data
          if (onLocationFound) {
            onLocationFound({
              lat: centerLat,
              lon: centerLon,
              postalCode,
              stations: enriched
            });
          }
        })
        .catch(err => {
          console.error('Failed to enrich with brands:', err);
          setLoadingBrands(false);
        });

      // Notify parent component about the location (with initial data)
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
        
        // Sort stations by distance from user location
        let sorted = sortByDistance(allStations, latitude, longitude);
        
        // Filter by fuel type and distance (max 50km)
        const fuelPriceField = `${selectedFuelType?.toLowerCase()}_prix`;
        const MAX_DISTANCE_KM = 50;
        
        sorted = sorted.filter(s => 
          s[fuelPriceField] != null && 
          s[fuelPriceField] !== '' && 
          s.distance <= MAX_DISTANCE_KM
        );

        // If not enough stations within 50km, try 100km
        if (sorted.length < 5) {
          sorted = sortByDistance(allStations, latitude, longitude)
            .filter(s => 
              s[fuelPriceField] != null && 
              s[fuelPriceField] !== '' && 
              s.distance <= 100
            );
        }

        // Sort by distance first, then by price
        sorted = sorted.sort((a, b) => {
          // First by distance (keep it reasonable)
          const distDiff = a.distance - b.distance;
          if (Math.abs(distDiff) > 5) return distDiff; // Significant distance difference
          // Then by price if stations are close to each other
          return (a[fuelPriceField] || 999) - (b[fuelPriceField] || 999);
        });
        
        const nearest = sorted.slice(0, 10);
        setSearchResults(nearest);

        // Enrich with brand names from OSM (in background)
        setLoadingBrands(true);
        enrichStationsWithBrands(nearest, latitude, longitude)
          .then(enriched => {
            setSearchResults(enriched);
            setLoadingBrands(false);
            
            // Update parent with enriched data
            if (onUseMyLocation) {
              onUseMyLocation({
                lat: latitude,
                lon: longitude,
                stations: enriched
              });
            }
          })
          .catch(err => {
            console.error('Failed to enrich with brands:', err);
            setLoadingBrands(false);
          });

        // Notify parent component (with initial data)
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

  const handleStationClick = (station) => {
    const coords = parseCoordinates(station);
    if (coords && onStationClick) {
      onStationClick(station, coords);
    }
  };

  const handleNavigate = (event, station) => {
    event.stopPropagation(); // Prevent list item click
    const coords = parseCoordinates(station);
    if (coords) {
      const label = getStationAddress(station);
      navigateToStation(coords.lat, coords.lon, label);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
        Find Nearby Stations
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'flex-start' } }}>
        <TextField
          label="Postal Code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="75001"
          inputProps={{ maxLength: 5, pattern: '[0-9]*' }}
          sx={{ width: { xs: '100%', sm: 200 } }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
          fullWidth
          sx={{ display: { xs: 'flex', sm: 'inline-flex' } }}
        >
          Search
        </Button>
        <Button
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={handleUseMyLocation}
          fullWidth
          sx={{ display: { xs: 'flex', sm: 'inline-flex' } }}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
            <Typography variant="h6">
              {searchResults.length} Nearest Stations
            </Typography>
            {loadingBrands && (
              <Typography variant="caption" color="text.secondary">
                Loading brands...
              </Typography>
            )}
          </Box>
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {searchResults.map((station, index) => {
              const fuelPrice = station[fuelPriceField];
              return (
                <React.Fragment key={index}>
                  <ListItemButton 
                    alignItems="flex-start"
                    onClick={() => handleStationClick(station)}
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      display: 'flex',
                      alignItems: 'flex-start',
                      position: 'relative',
                      pr: 1
                    }}
                  >
                    <LocationOnIcon sx={{ mr: 1, mt: 0.5, color: 'primary.main' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {station.brand && (
                            <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', display: 'block' }}>
                              {station.brand}
                            </Typography>
                          )}
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {station.ville} - {station.adresse}
                          </Typography>
                        </Box>
                        {fuelPrice && (
                          <Chip
                            label={`${fuelPrice}€`}
                            color="primary"
                            size="small"
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {station.cp} {station.ville}
                            {station.pop && ` • ${station.pop === 'R' ? 'Route' : 'Autoroute'}`}
                          </Typography>
                          {station.distance !== undefined && (
                            <Typography variant="caption" color="primary" fontWeight="bold">
                              {station.distance.toFixed(2)} km away
                            </Typography>
                          )}
                        </Box>
                        <Tooltip title="Navigate">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => handleNavigate(e, station)}
                            sx={{ ml: 1 }}
                          >
                            <DirectionsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </ListItemButton>
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
