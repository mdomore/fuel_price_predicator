const express = require('express');
const cors = require('cors');
const axios = require('axios');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const path = require('path');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3000;

// Cache for fuel prices data
let fuelPricesCache = {
    data: null,
    timestamp: null
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Proxy endpoint for fuel prices
app.get('/api/fuel-prices', async (req, res) => {
    try {
        // Check cache (valid for 5 minutes)
        const now = Date.now();
        if (fuelPricesCache.data && fuelPricesCache.timestamp && 
            (now - fuelPricesCache.timestamp < 5 * 60 * 1000)) {
            console.log('Returning cached fuel prices data');
            return res.json(fuelPricesCache.data);
        }

        console.log('Fetching fuel prices from OpenData...');
        const response = await axios.get('https://donnees.roulez-eco.fr/opendata/instantane', {
            responseType: 'arraybuffer'
        });

        console.log('Extracting XML from ZIP...');
        const zip = new AdmZip(response.data);
        const zipEntries = zip.getEntries();
        const xmlEntry = zipEntries.find(entry => entry.entryName.endsWith('.xml'));
        
        if (!xmlEntry) {
            throw new Error('No XML file found in the ZIP');
        }

        console.log('Parsing XML content...');
        const xmlContent = zip.readAsText(xmlEntry);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlContent);

        // Update cache
        fuelPricesCache = {
            data: result,
            timestamp: now
        };

        console.log('Successfully processed fuel prices data');
        res.json(result);
    } catch (error) {
        console.error('Error in /api/fuel-prices:', error);
        res.status(500).json({ 
            error: 'Failed to fetch fuel prices',
            details: error.message 
        });
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