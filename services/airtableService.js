const axios = require("axios");
const Fuse = require("fuse.js");
require("dotenv").config();

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
const AIRTABLE_ACCESS_TOKEN = process.env.AIRTABLE_ACCESS_TOKEN;

const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

// Utility function to get the current timestamp
const getCurrentTimestamp = () => new Date().toISOString();

const generateRecordId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let result = "rec";

    for (let i = 0; i < 14; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }

    return result;
};

// Fetch all records
const getRecords = async (filters = {}) => {
    let allRecords = [];
    let offset = null;

    try {
        // Build Airtable filterByFormula based on the filters provided
        let filterByFormula = "";

        if (filters.assignedTo) {
            filterByFormula = `AND({assigned_to} = '${filters.assignedTo}')`;
        }

        do {
            const params = {
                sort: [{ field: "updated_at", direction: "desc" }], // Sort by 'updated_at' descending
                filterByFormula: filterByFormula || undefined, // Apply the filter only if it's non-empty
            };
            if (offset) params.offset = offset; // Add offset to fetch the next page

            const response = await axios.get(airtableUrl, {
                params,
                headers: {
                    Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
                },
            });

            const records = response.data.records.map((record) => ({
                id: record.id,
                ...record.fields,
            }));

            allRecords = [...allRecords, ...records]; // Append records
            offset = response.data.offset; // Get the next offset token
        } while (offset); // Continue until there's no offset

        return allRecords;
    } catch (error) {
        console.error("Error fetching records:", error.response?.data || error.message);
        throw new Error("Failed to fetch records");
    }
};


// Create a new record
const createRecord = async (data) => {
    const timestamp = getCurrentTimestamp();

    try {
        const response = await axios.post(
            airtableUrl,
            {
                fields: {
                    ...data,
                    record_id: generateRecordId(),
                    created_at: timestamp,
                    updated_at: timestamp,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return { id: response.data.id, ...response.data.fields };
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

// Update an existing record
const updateRecord = async (id, data) => {
    const { id: _, created_at, ...restOfData } = data; // Ignore created_at during update

    try {
        const response = await axios.patch(
            `${airtableUrl}/${id}`,
            {
                fields: {
                    ...restOfData,
                    updated_at: getCurrentTimestamp(), // Update the updated_at field
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return { id: response.data.id, ...response.data.fields };
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

// Delete a record
const deleteRecord = async (id) => {
    try {
        await axios.delete(`${airtableUrl}/${id}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
            },
        });
        return { message: "Record deleted successfully" };
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || error.message);
    }
};

const getUsers = async () => {
    try {
        const records = await getRecords();

        // Extract emails from created_by and updated_by
        const users = new Set();
        records.forEach((record) => {
            if (record.created_by) users.add(record.created_by);
            if (record.updated_by) users.add(record.updated_by);
        });

        return Array.from(users); // Convert Set back to Array
    } catch (error) {
        console.error("Error fetching users:", error.message);
        throw new Error("Failed to fetch users");
    }
};

const getCompanyNameAndId = async () => {
    try {
        const response = await axios.get(airtableUrl, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
            },
        });

        // Use a Map to ensure uniqueness by company_id
        const uniqueCompanies = new Map();

        response.data.records.forEach((record) => {
            const { company_id, company_name } = record.fields;
            if (company_id && company_name && !uniqueCompanies.has(company_id)) {
                uniqueCompanies.set(company_id, company_name);
            }
        });

        // Convert Map back to an array of objects
        return Array.from(uniqueCompanies, ([company_id, company_name]) => ({
            company_id,
            company_name,
        }));
    } catch (error) {
        console.error("Error fetching unique company pairs:", error.message);
        throw new Error("Failed to fetch unique company pairs");
    }
};

const bulkReassignRecords = async (ids, assigned_to, updated_by) => {
    try {
        const batches = [];
        for (let i = 0; i < ids.length; i += 10) {
            const batch = ids.slice(i, i + 10).map((id) => ({
                id,
                fields: {
                    assigned_to,
                    updated_by,
                    updated_at: getCurrentTimestamp(),
                },
            }));
            batches.push(batch);
        }

        const responses = [];
        for (const batch of batches) {
            const response = await axios.patch(
                airtableUrl,
                { records: batch },
                {
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            responses.push(...response.data.records);
        }

        return responses;
    } catch (error) {
        console.error("Airtable API Error:", error.response?.data || error.message);
        throw new Error(
            error.response?.data?.error?.message || "Failed to bulk reassign records"
        );
    }
};

// Search on question and answer columns
const searchQuestionAnswer = async (searchTerm) => {
    const records = await getRecords();
    const fuse = new Fuse(records, {
        keys: ["question", "answer"],
        includeScore: true,
        threshold: 0.5,
        ignoreLocation: true,
    });

    return fuse.search(searchTerm).map((result) => result.item);
};

// Search on the properties column
const searchProperties = async (propertyKey, propertyValue) => {
    const records = await getRecords();
    const searchString = `${propertyKey}:${propertyValue}`;
    const fuse = new Fuse(records, {
        keys: ["properties"],
        includeScore: true,
        threshold: 0.5,
        ignoreLocation: true,
    });

    return fuse.search(searchString).map((result) => result.item);
};


module.exports = {
    getRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getUsers,
    getCompanyNameAndId,
    bulkReassignRecords,
    searchQuestionAnswer,
    searchProperties
};
