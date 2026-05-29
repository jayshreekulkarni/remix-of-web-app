const express = require("express");
const router = express.Router();
const pool = require("../db");

// ─── GET /api/team_members ───────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM team_members ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Team members fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/team_members ──────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { name, email, role, avatar_url } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: "name and email are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO team_members (name, email, role, avatar_url, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [name, email, role || null, avatar_url || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Team member insert error:", error);
    // Duplicate email
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "A team member with this email already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PATCH /api/team_members/:id ────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, role, avatar_url } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined)       { fields.push(`name = $${values.length + 1}`);       values.push(name); }
  if (email !== undefined)      { fields.push(`email = $${values.length + 1}`);      values.push(email); }
  if (role !== undefined)       { fields.push(`role = $${values.length + 1}`);       values.push(role); }
  if (avatar_url !== undefined) { fields.push(`avatar_url = $${values.length + 1}`); values.push(avatar_url); }

  if (fields.length === 0) {
    return res.status(400).json({ success: false, message: "Nothing to update" });
  }

  try {
    const result = await pool.query(
      `UPDATE team_members SET ${fields.join(", ")} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Team member patch error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /api/team_members/:id ───────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM team_members WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Team member delete error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;