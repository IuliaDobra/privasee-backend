const express = require("express");
const { getCompanyNameAndId } = require("../services/airtableService");
const router = express.Router();

// Fetch all company_name and company_id pairs
router.get("/", async (req, res) => {
    try {
        const companyPairs = await getCompanyNameAndId();
        res.status(200).json(companyPairs);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch companies",
            details: error.message,
        });
    }
});

module.exports = router;
