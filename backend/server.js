const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const leadsRoutes = require("./routes/leads");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CRM Backend Running");
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      success: true,
      message: "Database connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.use("/api/leads", leadsRoutes);

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

app.listen(5000, '0.0.0.0', () => {
  console.log('Backend running on 0.0.0.0:5000');
});