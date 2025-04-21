const express = require("express");
const sql = require("mssql");
const cors = require("cors"); // Import the cors package
const path = require("path");

// MSSQL Database configuration
const dbConfig = {
  user: "SIR", // Your MSSQL username
  password: "@Greenfields01", // Your MSSQL password
  server: "10.24.7.110", // Your MSSQL server IP
  database: "OPC_DATA", // Replace with your database name
  options: {
    encrypt: false, // Depending on your setup
    enableArithAbort: true,
  },
};

// Create an Express application
const app = express();
app.use(express.json({ limit: "200mb" })); // Atur limit payload
// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Connect to MSSQL
sql
  .connect(dbConfig)
  .then((pool) => {
    console.log("Connected to MSSQL");

    // API route to get transition counts and time differences
    app.get("/api/getlistparma/:variant", async (req, res) => {
      const variant = req.params.variant; // Get MachineType from URL

      const query = `WITH RankedQC AS (
          SELECT *,
                ROW_NUMBER() OVER (PARTITION BY Code ORDER BY Code ASC) AS rn
          FROM parameter_qc
          WHERE Product_Size = @variant
      )
      SELECT *
      FROM RankedQC
      WHERE rn = 1
      ORDER BY Code ASC`;
      try {
        const pool = await sql.connect(dbConfig); // Ensure pool is properly configured
        const result = await pool
          .request()
          .input("variant", sql.NVarChar, variant)
          .query(query); // Execute the query here

        // Send the query result as JSON
        res.json(result.recordset);
      } catch (error) {
        console.error("SQL error", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/api/sku/:variant", async (req, res) => {
      const variant = req.params.variant; // Get MachineType from URL

      const query = `
        SELECT * FROM SKUlist 
        WHERE Type LIKE '%' + @variant + '%'
      `;
      try {
        const pool = await sql.connect(dbConfig); // Ensure pool is properly configured
        const result = await pool
          .request()
          .input("variant", sql.NVarChar, variant)
          .query(query); // Execute the query here

        // Send the query result as JSON
        res.json(result.recordset);
      } catch (error) {
        console.error("SQL error", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/api/getdrafr", async (req, res) => {
      const variant = req.params.variant; // Get MachineType from URL

      const query = `SELECT * FROM parameter_qc_inputed WHERE Completed = 'false' order by Create_At asc`;
      try {
        const pool = await sql.connect(dbConfig); // Ensure pool is properly configured
        const result = await pool.request().query(query); // Execute the query here

        // Send the query result as JSON
        res.json(result.recordset);
      } catch (error) {
        console.error("SQL error", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.post("/api/post-param", async (req, res) => {
      const {
        bact_number,
        variant,
        param,
        prod,
        production_date,
        expiry_date,
        filler,
        start_production,
        last_production,
        product_size,
        completed,
      } = req.body;

      // Validasi input
      if (!variant || !param || !prod) {
        return res.status(400).json({
          message: "Field bact_number, variant, param, dan prod wajib diisi",
        });
      }

      const query = `
    INSERT INTO parameter_qc_inputed (
      Batch_Number,
      Variant,
      Parameter_Input,
      Product_Name,
      Production_Date,
      Expiry_Date,
      Filler,
      Start_Production,
      Last_Production,
      Product_Size,
      Create_At,
      Completed
    )
    VALUES (
      @bact_number,
      @variant,
      @param,
      @prod,
      @production_date,
      @expiry_date,
      @filler,
      @start_production,
      @last_production,
      @product_size,
      GETDATE(),
      @completed
    );
  `;

      try {
        const pool = await sql.connect(dbConfig);
        await pool
          .request()
          .input("bact_number", sql.VarChar, bact_number || null)
          .input("variant", sql.VarChar, variant)
          .input("param", sql.VarChar, param)
          .input("prod", sql.VarChar, prod)
          .input("production_date", sql.VarChar, production_date || null)
          .input("expiry_date", sql.VarChar, expiry_date || null)
          .input("filler", sql.VarChar, filler || null)
          .input("start_production", sql.VarChar, start_production || null)
          .input("last_production", sql.VarChar, last_production || null)
          .input("product_size", sql.VarChar, product_size || null)
          .input("completed", sql.VarChar, completed || null)
          .query(query);

        res.status(200).json({ message: "Berhasil menyimpan parameter QC" });
      } catch (error) {
        console.error("SQL Error:", error);
        res
          .status(500)
          .json({ message: "Terjadi kesalahan saat menyimpan data", error });
      }
    });

    app.post("/api/post-sample", async (req, res) => {
      const {
        bact_number, // atau batch_number?
        variant,
        prod,
        production_date,
        expiry_date,
        filler,
        product_size,
        timer,
        carton,
        start,
        random,
        end,
        keep,
        direct,
      } = req.body;

      // Validasi input wajib
      if (!bact_number || !variant || !prod) {
        return res.status(400).json({
          message: "Field bact_number, variant, dan prod wajib diisi",
        });
      }

      const query = `
    INSERT INTO sample_qc_inputed (
      Batch_Number,
      Variant,
      Product_Name,
      Production_Date,
      Expiry_Date,
      Filler,
      Product_Size,
      Timer,
      NoCarton,
      Start,
      Random,
      [End],
      Keeping,
      Direct,
      Anomali,
      Create_At
    )
    VALUES (
      @bact_number,
      @variant,
      @prod,
      @production_date,
      @expiry_date,
      @filler,
      @product_size,
      @timer,
      @carton,
      @start,
      @random,
      @end,
      @keep,
      @direct,
      0,
      GETDATE()
    );
  `;

      try {
        const pool = await sql.connect(dbConfig);
        await pool
          .request()
          .input("bact_number", sql.VarChar, bact_number)
          .input("variant", sql.VarChar, variant)
          .input("prod", sql.VarChar, prod)
          .input("production_date", sql.VarChar, production_date || null)
          .input("expiry_date", sql.VarChar, expiry_date || null)
          .input("filler", sql.VarChar, filler || null)
          .input("product_size", sql.VarChar, product_size || null)
          .input("timer", sql.Time, timer || null)
          .input("start", sql.Int, start || null)
          .input("random", sql.Int, random || null)
          .input("end", sql.Int, end || null)
          .input("keep", sql.Int, keep || null)
          .input("direct", sql.Int, direct || null)
          .input("carton", sql.Int, carton || null)
          .query(query);

        res.status(200).json({ message: "Berhasil menyimpan parameter QC" });
      } catch (error) {
        console.error("SQL Error:", error);
        res.status(500).json({
          message: "Terjadi kesalahan saat menyimpan data",
          error: error.message,
        });
      }
    });
  })
  .catch((err) => {
    console.error("Database connection failed", err);
  });

// Start the Express server
const PORT = 5002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
