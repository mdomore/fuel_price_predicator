// Import the Express app from backend
const app = require('../backend/src/server');

// Export as Vercel serverless function handler
module.exports = (req, res) => {
  // Forward all requests to the Express app
  return app(req, res);
};
