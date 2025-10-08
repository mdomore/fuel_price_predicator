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
  Grid
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import TradingViewWidget from '../components/TradingViewWidget';

const API_URL = '/api/fuel-prices';

const calculateTrendLine = (dates, prices) => {
  const xValues = dates.map((_, index) => index);
  const n = dates.length;
  
  const meanX = xValues.reduce((a, b) => a + b, 0) / n;
  const meanY = prices.reduce((a, b) => a + parseFloat(b), 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - meanX) * (parseFloat(prices[i]) - meanY);
    denominator += Math.pow(xValues[i] - meanX, 2);
  }
  
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  const trendLine = xValues.map(x => (slope * x + intercept).toFixed(3));
  
  return { currentTrend: trendLine };
};

const PriceTrends = () => {
  const [fuelType, setFuelType] = useState('Gazole');
  const [timeframe, setTimeframe] = useState(90);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);

  const fuelTypes = useMemo(() => [
    { value: 'Gazole', label: 'Diesel (Gazole)' },
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
      setError('No data available from API');
      return;
    }

    const stations = rawApiData.records.map(record => {
      const fields = record.fields;
      if (fields.carburants_disponibles && typeof fields.carburants_disponibles === 'string') {
        fields.carburants_disponibles = fields.carburants_disponibles.split(',').map(f => f.trim());
      }
      return fields;
    });

    const fuelPriceField = `${fuelType.toLowerCase()}_prix`;
    const fuelDateField = `${fuelType.toLowerCase()}_maj`;
    
    const filteredStations = stations.filter(station => {
      return station[fuelPriceField] != null && station[fuelPriceField] !== '';
    });

    if (filteredStations.length === 0) {
      setError(`No stations found with ${fuelType}`);
      setData(null);
      return;
    }

    const pricesByDate = {};
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - timeframe);

    filteredStations.forEach(station => {
      const fuelPrice = station[fuelPriceField];
      const lastUpdate = station[fuelDateField];
      
      if (fuelPrice) {
        const date = lastUpdate ? new Date(lastUpdate) : new Date();
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
      setError(`No recent prices found for ${fuelType}`);
      setData(null);
      return;
    }

    const prices = sortedDates.map(date => {
      const datePrices = pricesByDate[date];
      const avgPrice = datePrices.reduce((a, b) => a + b, 0) / datePrices.length;
      return avgPrice.toFixed(3);
    });

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
      const response = await fetch(API_URL);
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
  }, [processData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (rawData) {
      processData(rawData);
    }
  }, [fuelType, timeframe, rawData, processData]);

  const handleFuelTypeChange = (event) => {
    setFuelType(event.target.value);
  };

  const handleTimeframeChange = (event) => {
    setTimeframe(event.target.value);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Fuel Price Trends
        </Typography>

        <Grid container spacing={4}>
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

          {/* French Fuel Prices Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom align="center">
                French Fuel Prices with Trend Prediction
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
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
        </Grid>
      </Box>
    </Container>
  );
};

export default PriceTrends;
