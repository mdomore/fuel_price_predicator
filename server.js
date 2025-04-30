const express = require('express');
const cors = require('cors');
const axios = require('axios');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Proxy endpoint for fuel prices
app.get('/api/fuel-prices', async (req, res) => {
    try {
        // Fetch the ZIP file from the OpenData endpoint
        const response = await axios.get('https://donnees.roulez-eco.fr/opendata/instantane', {
            responseType: 'arraybuffer'
        });

        // Extract the XML file from the ZIP
        const zip = new AdmZip(response.data);
        const zipEntries = zip.getEntries();
        const xmlEntry = zipEntries.find(entry => entry.entryName.endsWith('.xml'));
        
        if (!xmlEntry) {
            throw new Error('No XML file found in the ZIP');
        }

        // Parse the XML content
        const xmlContent = zip.readAsText(xmlEntry);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlContent);

        res.json(result);
    } catch (error) {
        console.error('Error fetching fuel prices:', error);
        res.status(500).json({ error: 'Failed to fetch fuel prices' });
    }
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
}); 