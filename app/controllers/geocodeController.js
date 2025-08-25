const axios = require('axios');

exports.searchLocation = async (req, res) => {
  try {
    const { query } = req.query; // user input (e.g., "Sant")

    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'cartravel/1.0 (kamleshshelar99@gmail.com)'
      }
    });

    const locations = response.data.map(item => ({
      name: item.display_name,
      latitude: item.lat,
      longitude: item.lon
    }));

    res.json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
};
