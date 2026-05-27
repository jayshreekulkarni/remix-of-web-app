const express = require("express");
const router = express.Router();
const pool = require("../db"); // make sure this connects to your VPS database

router.post("/", async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      source,
      campaign_name,
      status,
      assigned_to,
      returned_from_lead_id,
      is_returned,
      meta,
    } = req.body;

    const query = `
      INSERT INTO public.leads (
        name,
        phone,
        email,
        source,
        campaign_name,
        status,
        assigned_to,
        returned_from_lead_id,
        is_returned,
        meta
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      RETURNING *;
    `;


    const formattedStatus =
    status.charAt(0).toUpperCase() +
    status.slice(1).toLowerCase();

    const values = [
      name,
      phone || null,
      email || null,
      source || null,
      campaign_name || null,
      formattedStatus,
      assigned_to || null,
      returned_from_lead_id || null,
      is_returned || false,
      meta || {},
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Lead insert error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET all leads
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.*,
        tm.name AS assignee_name,
        tm.role AS assignee_role
      FROM leads l
      LEFT JOIN team_members tm ON tm.id = l.assigned_to
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH bulk assign
router.patch("/bulk-assign", async (req, res) => {
  const { ids, assigned_to } = req.body;
  try {
    await pool.query(
      `UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
      [assigned_to, ids]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH bulk status
router.patch("/bulk-status", async (req, res) => {
  const { ids, status } = req.body;
  try {
    await pool.query(
      `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
      [status, ids]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;