const express = require('express');
const { searchLocation } = require('../controllers/geocodeController');
const router = express.Router();


/**
 * @swagger
 * /api/geocode/search:
 *   get:
 *     summary: Search locations using OpenStreetMap (Nominatim)
 *     description: Returns a list of matching locations with latitude and longitude based on the search query.
 *     tags: [Geocode]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           example: Sant
 *         description: The location search term (e.g., city, address, place name)
 *     responses:
 *       200:
 *         description: Successful response with list of matching locations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: Santa Barbara, CA, USA
 *                       latitude:
 *                         type: string
 *                         example: "34.4208"
 *                       longitude:
 *                         type: string
 *                         example: "-119.6982"
 *       400:
 *         description: Missing or invalid query parameter
 *       500:
 *         description: Internal server error
 */

router.get('/search', searchLocation);

module.exports = router;
