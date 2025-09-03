const express = require('express');
const path = require('path');
const db = require('./config/db'); // Import database connection
const app = express();

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data

// Import Routes AFTER using middleware
const disasterRoutes = require('./routes/disastersRoutes');
const victimsRoutes = require('./routes/victimsRoutes'); // Import Victims routes
const rescueoperationsRoutes = require('./routes/rescueoperationsRoutes');
const volunteersRoutes = require('./routes/volunteersRoutes');
const donationsRoutes = require('./routes/donationsRoutes');
const rescueteamsRoutes = require('./routes/rescueteamsRoutes');
const sheltersRoutes = require('./routes/sheltersRoutes');
const medicalRoutes = require('./routes/medicalRoutes');
const helplineRoutes = require('./routes/helplineRoutes');

app.use('/disasters', disasterRoutes);
app.use('/victims', victimsRoutes); // Use Victims routes
app.use('/rescueoperations', rescueoperationsRoutes);
app.use('/volunteers', volunteersRoutes);
app.use('/donations', donationsRoutes);
app.use('/rescueteams', rescueteamsRoutes);
app.use('/shelters', sheltersRoutes);
app.use('/medical', medicalRoutes);
app.use('/helpline', helplineRoutes);

// Default route serves the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
