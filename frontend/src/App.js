import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box
} from '@mui/material';
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
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StationFinder from './pages/StationFinder';
import PriceTrends from './pages/PriceTrends';
import 'leaflet/dist/leaflet.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function NavigationBar() {
  const location = useLocation();
  
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Fuel Price Predictor
        </Typography>
        <Button
          color="inherit"
          component={Link}
          to="/"
          startIcon={<SearchIcon />}
          sx={{ 
            borderBottom: location.pathname === '/' ? '2px solid white' : 'none',
            borderRadius: 0
          }}
        >
          Find Stations
        </Button>
        <Button
          color="inherit"
          component={Link}
          to="/trends"
          startIcon={<TrendingUpIcon />}
          sx={{ 
            borderBottom: location.pathname === '/trends' ? '2px solid white' : 'none',
            borderRadius: 0
          }}
        >
          Price Trends
        </Button>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  return (
    <Router>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <NavigationBar />
        <Routes>
          <Route path="/" element={<StationFinder />} />
          <Route path="/trends" element={<PriceTrends />} />
        </Routes>
      </Box>
    </Router>
  );
}

export default App;