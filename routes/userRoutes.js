const express = require("express");
const { getUsers } = require("../services/airtableService");
const router = express.Router();

// Fetch all unique users
router.get("/", async (req, res) => {
    try {
        const users = await getUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
});

module.exports = router;
