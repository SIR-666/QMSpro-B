const sql = require('mssql');

// MSSQL Database configuration
const dbConfig = {
    user: 'SIR',           // Your MSSQL username
    password: '@Greenfields01', // Your MSSQL password
    server: '10.24.7.110',    // Your MSSQL server IP
    database: 'OPC_DATA', // Replace with your database name
    options: {
        encrypt: false,         // Depending on your setup
        enableArithAbort: true,
    }
};

const connectDb = async () => {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected to MSSQL');
        return pool;
    } catch (err) {
        console.error('Database connection failed', err);
        throw err;
    }
};

module.exports = { connectDb, sql };
