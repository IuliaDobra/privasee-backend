require('dotenv').config();
const express = require('express');
const questionRoutes = require('./routes/questionRoutes');
const userRoutes = require('./routes/userRoutes');
const companyRoutes = require('./routes/companyRoutes');

const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allow all origins
app.use(express.json());

// Routes
app.use('/api/questions', questionRoutes); // Add questions route
app.use('/api/users', userRoutes); // Add users route
app.use('/api/companies', companyRoutes); // Add companies route


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});