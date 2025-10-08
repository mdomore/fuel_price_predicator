import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import TradingViewWidget from './components/TradingViewWidget';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = '/api/fuel-prices';
const REGIONS_URL = '/api/regions';
const DEPARTMENTS_URL = '/api/departments';
const TOWNS_URL = '/api/towns';

// Remove the unused debounce function and add trend calculation functions
const calculateTrendLine = (dates, prices) => {
  const xValues = dates.map((_, index) => index);
  const n = dates.length;
  
  // Calculate means
  const meanX = xValues.reduce((a, b) => a + b, 0) / n;
  const meanY = prices.reduce((a, b) => a + parseFloat(b), 0) / n;
  
  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - meanX) * (parseFloat(prices[i]) - meanY);
    denominator += Math.pow(xValues[i] - meanX, 2);
  }
  
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  // Generate trend line points only for existing data
  const trendLine = xValues.map(x => (slope * x + intercept).toFixed(3));
  
  return {
    currentTrend: trendLine
  };
};

function App() {
  const [fuelType, setFuelType] = useState('Gazole');
  const [timeframe, setTimeframe] = useState(90);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  
  // Location state
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [regions, setRegions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [towns, setTowns] = useState([]);
  const [fuelStations, setFuelStations] = useState([]);

  const fuelTypes = useMemo(() => [
    { value: 'Gazole', label: 'Diesel' },
    { value: 'SP95', label: 'SP95' },
    { value: 'SP98', label: 'SP98' },
    { value: 'E10', label: 'SP95-E10' },
    { value: 'GPLc', label: 'GPL' }
  ], []);

  const timeframes = useMemo(() => [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
    { value: 180, label: 'Last 180 days' },
    { value: 365, label: 'Last 365 days' }
  ], []);

  const processData = useCallback((rawApiData) => {
    if (!rawApiData?.records) {
      setError('No data available');
      return;
    }

    const stations = rawApiData.records.map(record => {
      const fields = record.fields;
      // Convert carburants_disponibles string to array if needed
      if (fields.carburants_disponibles && typeof fields.carburants_disponibles === 'string') {
        fields.carburants_disponibles = fields.carburants_disponibles.split(',').map(f => f.trim());
      }
      return fields;
    });
    setFuelStations(stations);

    // Filter stations by fuel type availability
    const filteredStations = stations.filter(station => {
      const availableFuels = station.carburants_disponibles || [];
      return availableFuels.includes(fuelType);
    });

    if (filteredStations.length === 0) {
      setError(`No stations found with ${fuelType} in the selected area`);
      setData(null);
      return;
    }

    // Group prices by date for trend analysis
    const pricesByDate = {};
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - timeframe);

    filteredStations.forEach(station => {
      const fuelPrice = station[`prix_${fuelType.toLowerCase()}`];
      const lastUpdate = station[`prix_${fuelType.toLowerCase()}_maj`];
      
      if (fuelPrice && lastUpdate) {
        const date = new Date(lastUpdate);
        if (date >= startDate) {
          const dateStr = date.toLocaleDateString('fr-FR');
          if (!pricesByDate[dateStr]) {
            pricesByDate[dateStr] = [];
          }
          pricesByDate[dateStr].push(parseFloat(fuelPrice));
        }
      }
    });

    const sortedDates = Object.keys(pricesByDate).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });

    if (sortedDates.length === 0) {
      setError(`No recent prices found for ${fuelType} in the selected area`);
      setData(null);
      return;
    }

    const prices = sortedDates.map(date => {
      const datePrices = pricesByDate[date];
      const avgPrice = datePrices.reduce((a, b) => a + b, 0) / datePrices.length;
      return avgPrice.toFixed(3);
    });

    // Calculate trend line
    const { currentTrend } = calculateTrendLine(sortedDates, prices);

    setData({
      labels: sortedDates,
      datasets: [
        {
          label: `${fuelType} Price (€/L)`,
          data: prices,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          fill: true
        },
        {
          label: 'Trend Line',
          data: currentTrend,
          borderColor: 'rgba(255, 99, 132, 0.8)',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    });
    setError(null);
  }, [fuelType, timeframe]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedRegion) params.append('region', selectedRegion);
      if (selectedDepartment) params.append('departement', selectedDepartment);
      if (selectedTown) params.append('ville', selectedTown);
      
      const response = await fetch(`${API_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newData = await response.json();
      setRawData(newData);
      processData(newData);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [processData, selectedRegion, selectedDepartment, selectedTown]);

  // Fetch regions
  const fetchRegions = useCallback(async () => {
    try {
      const response = await fetch(REGIONS_URL);
      if (response.ok) {
        const data = await response.json();
        setRegions(data);
      }
    } catch (err) {
      console.error('Error fetching regions:', err);
    }
  }, []);

  // Fetch departments for selected region
  const fetchDepartments = useCallback(async (region) => {
    if (!region) {
      setDepartments([]);
      setTowns([]);
      return;
    }
    try {
      const response = await fetch(`${DEPARTMENTS_URL}/${encodeURIComponent(region)}`);
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }, []);

  // Fetch towns for selected department
  const fetchTowns = useCallback(async (department) => {
    if (!department) {
      setTowns([]);
      return;
    }
    try {
      const response = await fetch(`${TOWNS_URL}/${encodeURIComponent(department)}`);
      if (response.ok) {
        const data = await response.json();
        setTowns(data);
      }
    } catch (err) {
      console.error('Error fetching towns:', err);
    }
  }, []);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (rawData) {
      processData(rawData);
    }
  }, [fuelType, timeframe, rawData, processData]);

  useEffect(() => {
    if (selectedRegion) {
      fetchDepartments(selectedRegion);
      setSelectedDepartment('');
      setSelectedTown('');
    }
  }, [selectedRegion, fetchDepartments]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchTowns(selectedDepartment);
      setSelectedTown('');
    }
  }, [selectedDepartment, fetchTowns]);

  const handleFuelTypeChange = (event) => {
    setFuelType(event.target.value);
  };

  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
  };

  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
  };

  const handleTownChange = (event) => {
    setSelectedTown(event.target.value);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
          Fuel Price Predictor
        </Typography>

        <Grid container spacing={4}>
          {/* Location Selection */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom align="center">
                Select Location
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Region</InputLabel>
                  <Select
                    value={selectedRegion}
                    label="Region"
                    onChange={handleRegionChange}
                  >
                    <MenuItem value="">All Regions</MenuItem>
                    {regions.map(region => (
                      <MenuItem key={region} value={region}>
                        {region}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }} disabled={!selectedRegion}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={selectedDepartment}
                    label="Department"
                    onChange={handleDepartmentChange}
                  >
                    <MenuItem value="">All Departments</MenuItem>
                    {departments.map(dept => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }} disabled={!selectedDepartment}>
                  <InputLabel>Town</InputLabel>
                  <Select
                    value={selectedTown}
                    label="Town"
                    onChange={handleTownChange}
                  >
                    <MenuItem value="">All Towns</MenuItem>
                    {towns.map(town => (
                      <MenuItem key={town} value={town}>
                        {town}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          </Grid>

          {/* Brent Crude Oil Price Widget */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h5" component="h2" gutterBottom align="center">
                Brent Crude Oil Price
              </Typography>
              <Box sx={{ 
                height: '550px', 
                width: '100%',
                '& .tradingview-widget-container': {
                  height: '550px !important'
                }
              }}>
                <TradingViewWidget />
              </Box>
            </Paper>
          </Grid>

          {/* Fuel Prices Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom align="center">
                French Fuel Prices with Trend Prediction
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
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

                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Timeframe</InputLabel>
                  <Select
                    value={timeframe}
                    label="Timeframe"
                    onChange={handleTimeframeChange}
                  >
                    {timeframes.map(frame => (
                      <MenuItem key={frame.value} value={frame.value}>
                        {frame.label}
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
              ) : data ? (
                <Box sx={{ height: 500 }}>
                  <Line
                    data={data}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: false,
                          title: {
                            display: true,
                            text: 'Price (€/L)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Date'
                          },
                          reverse: false,
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        }
                      },
                      interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                      }
                    }}
                  />
                </Box>
              ) : null}
            </Paper>
          </Grid>

          {/* Fuel Stations Table */}
          {fuelStations.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom align="center">
                  Fuel Stations in Selected Area
                </Typography>
                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Station Name</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell>City</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Region</TableCell>
                        <TableCell>Available Fuels</TableCell>
                        <TableCell>Diesel Price</TableCell>
                        <TableCell>SP95 Price</TableCell>
                        <TableCell>SP98 Price</TableCell>
                        <TableCell>E10 Price</TableCell>
                        <TableCell>Last Update</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fuelStations.slice(0, 100).map((station, index) => (
                        <TableRow key={index}>
                          <TableCell>{station.nom || 'N/A'}</TableCell>
                          <TableCell>{station.adresse || 'N/A'}</TableCell>
                          <TableCell>{station.ville || 'N/A'}</TableCell>
                          <TableCell>{station.departement || 'N/A'}</TableCell>
                          <TableCell>{station.region || 'N/A'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {(station.carburants_disponibles || []).map((fuel, idx) => (
                                <Chip key={idx} label={fuel} size="small" color="primary" />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {station.prix_gazole ? `${station.prix_gazole}€` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {station.prix_sp95 ? `${station.prix_sp95}€` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {station.prix_sp98 ? `${station.prix_sp98}€` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {station.prix_e10 ? `${station.prix_e10}€` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {station.prix_maj ? new Date(station.prix_maj).toLocaleString('fr-FR') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {fuelStations.length > 100 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Showing first 100 stations out of {fuelStations.length} total
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    </Container>
  );
}

export default App; 