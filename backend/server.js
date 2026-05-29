const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Import routes
const leadRoutes = require("./routes/leads");
const teamMemberRoutes = require("./routes/team_members");

// Middleware
app.use(cors({
  origin: "http://187.127.128.34:8080", // frontend URL
  credentials: true
}));
app.use(express.json());

// Mount the router
app.use("/api/leads", leadRoutes);
app.use("/api/team_members", teamMemberRoutes);
app.use("/api/team",         teamMemberRoutes);

// Test route to confirm server is running
app.get("/", (req, res) => {
  res.send("CRM Backend Running");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});