const express = require('express');
const { createRecord, getRecords, updateRecord, deleteRecord , bulkReassignRecords} = require('../services/airtableService');
const router = express.Router();

// Create a question
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const newRecord = await createRecord(data);
        res.status(201).json(newRecord);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create record', details: error.message });
    }
});

// Get all questions
router.get("/", async (req, res) => {
    try {
        // Call the getRecords function directly, without pagination
        const records = await getRecords();

        res.status(200).json({
            records,
            totalRecords: records.length,
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch records",
            details: error.message
        });
    }
});

// Bulk reassign questions
router.put('/bulk-reassign', async (req, res) => {
    try {
        const { ids, assigned_to, updated_by } = req.body;

        console.log("Received Bulk Reassign Payload:", req.body);

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Invalid or missing "ids"' });
        }
        if (!assigned_to) {
            return res.status(400).json({ error: 'Missing "assigned_to"' });
        }
        if (!updated_by) {
            return res.status(400).json({ error: 'Missing "updated_by"' });
        }

        const updatedRecords = await bulkReassignRecords(ids, assigned_to, updated_by);

        res.status(200).json({ message: 'Records reassigned successfully', updatedRecords });
    } catch (error) {
        console.error('Bulk Reassign Error:', error.message);
        res.status(500).json({ error: 'Failed to bulk reassign records', details: error.message });
    }
});



// Update a question
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const updatedRecord = await updateRecord(id, data);
        res.status(200).json(updatedRecord);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update record', details: error.message });
    }
});

// Delete a question
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await deleteRecord(id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete record', details: error.message });
    }
});


module.exports = router;