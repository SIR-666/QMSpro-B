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

    app.get("/api/getsubmited", async (req, res) => {
      const variant = req.params.variant; // Get MachineType from URL

      const query = `SELECT * FROM parameter_qc_inputed WHERE Completed = 'true' order by Create_At asc`;
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

    app.get("/api/getdraf-details/:input_at", async (req, res) => {
      const input_at = req.params.input_at; // Get MachineType from URL

      const query = `SELECT * FROM parameter_qc_inputed WHERE Input_At = @input_at`;
      try {
        const pool = await sql.connect(dbConfig); // Ensure pool is properly configured
        const result = await pool
          .request()
          .input("input_at", sql.VarChar, input_at || null)
          .query(query); // Execute the query here

        // Send the query result as JSON
        res.json(result.recordset);
      } catch (error) {
        console.error("SQL error", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get(
      "/api/getqc-inputed/:Filler/:prodname/:proddate",
      async (req, res) => {
        const Filler = req.params.Filler; // Get MachineType from URL
        const prodname = req.params.prodname;
        const proddate = req.params.proddate;
        console.log("prord date : ", proddate);

        // Format tanggal ke YYYY-MM-DD
        const parsedDate = new Date(proddate);
        const formattedDate = parsedDate.toISOString().split("T")[0]; // contoh hasil: 2025-05-27

        console.log("Formatted proddate: ", formattedDate);

        const query = `SELECT * FROM qc_sample_inputed WHERE Filler = @Filler AND Product_Name = @prodname and Production_Date = @formattedDate`;
        try {
          const pool = await sql.connect(dbConfig); // Ensure pool is properly configured
          const result = await pool
            .request()
            .input("Filler", sql.VarChar, Filler || null)
            .input("prodname", sql.VarChar, prodname || null)
            .input("formattedDate", sql.VarChar, formattedDate || null)
            .query(query); // Execute the query here

          // Send the query result as JSON
          res.json(result.recordset);
        } catch (error) {
          console.error("SQL error", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );

    app.post("/api/post-param", async (req, res) => {
      const {
        bact_number,
        variant,
        param,
        prod,
        production_date,
        expiry_date,
        input_at,
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

      try {
        const pool = await sql.connect(dbConfig);

        // 1. Cek apakah data sudah ada
        const checkQuery = `
      SELECT *
      FROM parameter_qc_inputed
      WHERE Input_At = @input_at
        AND Filler = @filler
        AND Production_Date = @production_date
        AND Product_Size = @product_size
    `;

        const checkResult = await pool
          .request()
          .input("input_at", sql.VarChar, input_at || null)
          .input("filler", sql.VarChar, filler || null)
          .input("production_date", sql.VarChar, production_date || null)
          .input("product_size", sql.VarChar, product_size || null)
          .query(checkQuery);

        if (checkResult.recordset.length > 0) {
          // Sudah ada data, kirimkan data existing
          console.log("data existing");
          return res.status(200).json({
            message: "Data sudah ada",
            existingData: checkResult.recordset,
          });
        }

        // 2. Insert data baru
        const insertQuery = `
      INSERT INTO parameter_qc_inputed (
        Batch_Number,
        Variant,
        Parameter_Input,
        Product_Name,
        Production_Date,
        Expiry_Date,
        Input_At,
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
        @input_at,
        @filler,
        @start_production,
        @last_production,
        @product_size,
        GETDATE(),
        @completed
      );
    `;

        await pool
          .request()
          .input("bact_number", sql.VarChar, bact_number || null)
          .input("variant", sql.VarChar, variant)
          .input("param", sql.VarChar, param)
          .input("prod", sql.VarChar, prod)
          .input("production_date", sql.VarChar, production_date || null)
          .input("expiry_date", sql.VarChar, expiry_date || null)
          .input("input_at", sql.VarChar, input_at || null)
          .input("filler", sql.VarChar, filler || null)
          .input("start_production", sql.VarChar, start_production || null)
          .input("last_production", sql.VarChar, last_production || null)
          .input("product_size", sql.VarChar, product_size || null)
          .input("completed", sql.VarChar, completed || null)
          .query(insertQuery);

        res.status(200).json({ message: "Berhasil menyimpan parameter QC" });
      } catch (error) {
        console.error("SQL Error:", error);
        res
          .status(500)
          .json({ message: "Terjadi kesalahan saat menyimpan data", error });
      }
    });

    app.post("/api/post-verif", async (req, res) => {
      const {
        bact_number,
        variant,
        param,
        prod,
        production_date,
        expiry_date,
        input_at,
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
    INSERT INTO verif_qc_inputed (
      Batch_Number,
      Variant,
      Parameter_Input,
      Product_Name,
      Production_Date,
      Expiry_Date,
      Input_At,
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
      @input_at,
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
          .input("input_at", sql.VarChar, input_at || null)
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

    app.post("/api/update-param", async (req, res) => {
      const {
        bact_number,
        param,
        prod,
        production_date,
        expiry_date,
        input_at,
        filler,
        start_production,
        last_production,
        product_size,
        completed,
      } = req.body;

      // console.log("input at: ", input_at);
      // console.log("Filler: ", filler);
      // console.log("product_size: ", product_size);
      // console.log("Product_Name: ", prod);
      // console.log("batch: ", bact_number);
      // Validasi input
      if (!param || !prod) {
        return res.status(400).json({
          message: "Field bact_number, variant, param, dan prod wajib diisi",
        });
      }

      const query = `
    Update parameter_qc_inputed set 
    Batch_Number = @bact_number, 
    Parameter_Input=@param,
    Production_Date=@production_date,
    Expiry_Date=@expiry_date,
    Start_Production=@start_production,
    Last_Production=@last_production,
    Update_At=GETDATE(),
    Completed=@completed
    where
    Product_Name=@prod AND Input_At=@input_at AND Filler=@filler AND Product_Size=@product_size
    ;
  `;

      try {
        const pool = await sql.connect(dbConfig);
        await pool
          .request()
          .input("bact_number", sql.VarChar, bact_number || null)
          .input("param", sql.VarChar, param)
          .input("prod", sql.VarChar, prod)
          .input("production_date", sql.VarChar, production_date || null)
          .input("expiry_date", sql.VarChar, expiry_date || null)
          .input("input_at", sql.VarChar, input_at || null)
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

    app.post("/api/post-sample2", async (req, res) => {
      const {
        bact_number, // atau batch_number?
        variant,
        prod,
        production_date,
        expiry_date,
        filler,
        product_size,
        timer,
        data,
      } = req.body;

      // Validasi input wajib
      if (!variant || !prod) {
        return res.status(400).json({
          message: "Field bact_number, variant, dan prod wajib diisi",
        });
      }

      const query = `
    INSERT INTO qc_sample_inputed (
      Batch_Number,
      Variant,
      Product_Name,
      Production_Date,
      Expiry_Date,
      Filler,
      Product_Size,
      Timer,
      Data,
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
      @data,
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
          .input("data", sql.VarChar, data || null)
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
const PORT = 5008;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
