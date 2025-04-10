const { sql } = require('../config/db');

const getTransitions = async (pool, req, res) => {
    try {
        const result = await pool.request().query(`EXEC GetMachineTagTransitions;`);
        res.json(result.recordset);
    } catch (error) {
        console.error('SQL error', error);
        res.status(500).send('Internal Server Error');
    }
};

const getTransitionsAll = async (pool, req, res) => {
    const machinetype = req.params.MachineType;
    const month = req.params.month;
    const query = `EXEC AllGetMachineTagTransitions @MachineType, @month;`;

    try {
        const result = await pool.request()
            .input('MachineType', sql.NVarChar, machinetype)
            .input('month', sql.Int, month)
            .query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error('SQL error', error);
        res.status(500).send('Internal Server Error');
    }
};

// Define other controllers in a similar way...

module.exports = { getTransitions, getTransitionsAll /* other exports */ };
