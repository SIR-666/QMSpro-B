const { sql } = require('../config/db');

// Example for getting water yogurt data
const getWaterYogurt = async (pool, req, res) => {
    const area = req.query.area;
    if (!area) {
        return res.status(400).send('Area parameter is required');
    }
    try {
        const result = await pool.request()
            .input('Area', sql.NVarChar, area)
            .query('SELECT * FROM WaterYogurt WHERE Area = @Area ORDER BY WEEKnumber');
        res.json(result.recordset);
    } catch (error) {
        console.error('SQL error', error);
        res.status(500).send('Internal Server Error');
    }
};

// Define additional functions for fuel, electric, etc...

module.exports = { getWaterYogurt /* other exports */ };
