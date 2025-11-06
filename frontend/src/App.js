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
    <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          Fuel Price Predictor
        </Typography>
        <Button
          color="inherit"
          component={Link}
          to="/"
          startIcon={<SearchIcon sx={{ display: { xs: 'none', sm: 'inline' } }} />}
          sx={{ 
            borderBottom: location.pathname === '/' ? '2px solid white' : 'none',
            borderRadius: 0,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            minWidth: { xs: 'auto', sm: 'auto' },
            px: { xs: 1, sm: 2 }
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Find </Box>Stations
        </Button>
        <Button
          color="inherit"
          component={Link}
          to="/trends"
          startIcon={<TrendingUpIcon sx={{ display: { xs: 'none', sm: 'inline' } }} />}
          sx={{ 
            borderBottom: location.pathname === '/trends' ? '2px solid white' : 'none',
            borderRadius: 0,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            minWidth: { xs: 'auto', sm: 'auto' },
            px: { xs: 1, sm: 2 }
          }}
        >
          Trends
        </Button>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  return (
    <Router basename="/fuelprice">
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
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