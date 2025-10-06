const express = require('express');
const cors = require('cors');
const axios = require('axios');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const path = require('path');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 4000;

// Cache for fuel prices data
let fuelPricesCache = {
    data: null,
    timestamp: null
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from the frontend build directory (CRA builds to 'build')
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Helper to call Opendatasoft v1 search API with proper facet/refine params
async function odsSearch({ filters = {}, rows = 10000, facets = [] } = {}) {
    try {
        const now = Date.now();
        const baseUrl = 'https://data.economie.gouv.fr/api/records/1.0/search/';
        const params = new URLSearchParams();
        params.append('dataset', 'prix-des-carburants-en-france-flux-instantane-v2');
        params.append('rows', String(rows));

        // facets
        (facets && facets.length ? facets : []).forEach(f => params.append('facet', f));

        // refine.<facet>
        if (filters.region) params.append('refine.region', filters.region);
        if (filters.departement) params.append('refine.departement', filters.departement);
        if (filters.ville) params.append('refine.ville', filters.ville);
        if (filters.code_postal) params.append('refine.code_postal', filters.code_postal);

        if (filters.q) params.append('q', filters.q);

        const url = `${baseUrl}?${params.toString()}`;
        const response = await axios.get(url);
        return { data: response.data, fetchedAt: now };
    } catch (error) {
        console.error('Error calling ODS search:', error?.response?.data || error.message);
        throw error;
    }
}

// Get all available regions
app.get('/api/regions', async (req, res) => {
    try {
        const { data } = await odsSearch({ rows: 0, facets: ['region'] });
        const facetGroup = (data.facet_groups || []).find(g => g.name === 'region');
        const regions = (facetGroup?.facets || []).map(f => f.name).sort();
        res.json(regions);
    } catch (error) {
        console.error('Error fetching regions:', error);
        res.status(500).json({ error: 'Failed to fetch regions' });
    }
});

// Get departments for a specific region
app.get('/api/departments/:region', async (req, res) => {
    try {
        const { region } = req.params;
        const { data } = await odsSearch({ filters: { region }, rows: 0, facets: ['departement'] });
        const facetGroup = (data.facet_groups || []).find(g => g.name === 'departement');
        const departments = (facetGroup?.facets || []).map(f => f.name).sort();
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Get towns for a specific department
app.get('/api/towns/:department', async (req, res) => {
    try {
        const { department } = req.params;
        const { data } = await odsSearch({ filters: { departement: department }, rows: 0, facets: ['ville'] });
        const facetGroup = (data.facet_groups || []).find(g => g.name === 'ville');
        const towns = (facetGroup?.facets || []).map(f => f.name).sort();
        res.json(towns);
    } catch (error) {
        console.error('Error fetching towns:', error);
        res.status(500).json({ error: 'Failed to fetch towns' });
    }
});

// Get fuel prices with optional location filtering
app.get('/api/fuel-prices', async (req, res) => {
    try {
        const { region, departement, ville, code_postal, query } = req.query;
        const filters = {};
        if (region) filters.region = region;
        if (departement) filters.departement = departement;
        if (ville) filters.ville = ville;
        if (code_postal) filters.code_postal = code_postal;
        if (query) filters.q = query;

        // cache by key (simple)
        const cacheKey = JSON.stringify({ filters });
        const now = Date.now();
        if (
            fuelPricesCache.data &&
            fuelPricesCache.timestamp &&
            fuelPricesCache.key === cacheKey &&
            now - fuelPricesCache.timestamp < 10 * 60 * 1000
        ) {
            return res.json(fuelPricesCache.data);
        }

        const { data } = await odsSearch({ filters, rows: 10000 });
        fuelPricesCache = { data, timestamp: now, key: cacheKey };
        res.json(data);
    } catch (error) {
        console.error('Error in /api/fuel-prices:', error);
        res.status(500).json({ 
            error: 'Failed to fetch fuel prices',
            details: error.message 
        });
    }
});

// Simple search endpoint returning unique matches for regions, departments, towns, and zip codes
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ regions: [], departments: [], towns: [], zips: [] });
        const isZip = /^\d{5}$/.test(q);
        const filters = isZip ? { code_postal: q } : { q };
        const { data } = await odsSearch({ filters, rows: 200, facets: ['region', 'departement', 'ville', 'code_postal'] });
        const groups = data.facet_groups || [];
        const get = (name) => (groups.find(g => g.name === name)?.facets || []).map(f => f.name);
        res.json({
            regions: get('region'),
            departments: get('departement'),
            towns: get('ville'),
            zips: get('code_postal')
        });
    } catch (error) {
        console.error('Error in /api/search:', error);
        res.status(500).json({ error: 'Failed to search locations' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
}); 