const express = require('express');
const path = require('path');
const db = require('../config/db'); // Import MySQL connection
const router = express.Router();


// Serve the Victims HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'volunteers.html'));
});



// Fetch all volunteer data without filters
router.get('/api', (req, res) => {
  const query = `
  SELECT v.VolunteerID, 
         v.FirstName, 
         v.LastName, 
         v.ContactNumber, 
         v.Skills, 
         v.AvailabilityStatus
  FROM Volunteer v
  LIMIT 50;
`;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching volunteer data from the database');
    }
    res.json(results); // Send the fetched data as JSON to the frontend
  });
});

// Search volunteers based on query
router.get('/api/search', (req, res) => {
  const searchQuery = req.query.query || '';  // Default empty string

  let query = `
  SELECT v.VolunteerID, 
         v.FirstName, 
         v.LastName, 
         v.ContactNumber, 
         v.Skills, 
         v.AvailabilityStatus
  FROM Volunteer v
  WHERE LOWER(v.VolunteerID) LIKE LOWER(?) 
     OR LOWER(v.FirstName) LIKE LOWER(?) 
     OR LOWER(v.LastName) LIKE LOWER(?) 
     OR LOWER(v.ContactNumber) LIKE LOWER(?) 
     OR LOWER(v.Skills) LIKE LOWER(?) 
     OR LOWER(v.AvailabilityStatus) LIKE LOWER(?)
  LIMIT 50;
`;

  const wildcardSearch = `%${searchQuery}%`;
  const params = [
    wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch
  ];

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching data from the database');
    }
    res.json(results); // Send data back to frontend
  });
});


// Statistics endpoint for volunteer data
router.get('/api/statistics', (req, res) => {
  console.log('Volunteer statistics API endpoint hit'); // Debug log
  
  // Query to get total volunteer count
  const totalVolunteersQuery = 'SELECT COUNT(*) as volunteerCount FROM Volunteer';
  
  // Query to get available volunteers count
  const availableVolunteersQuery = 'SELECT COUNT(*) as availableCount FROM Volunteer WHERE AvailabilityStatus = "Available"';
  
  // Query to get most recent volunteer
  const recentVolunteerQuery = `
    SELECT CONCAT(FirstName, ' ', LastName) AS Name,
           Skills,
           AvailabilityStatus
    FROM Volunteer
    ORDER BY VolunteerID DESC
    LIMIT 1
  `;

  // Execute all queries
  db.query(totalVolunteersQuery, (err1, totalResults) => {
    if (err1) {
      console.error('Error fetching total volunteers count:', err1);
      return res.status(500).json({ error: 'Error fetching volunteer statistics' });
    }

    db.query(availableVolunteersQuery, (err2, availableResults) => {
      if (err2) {
        console.error('Error fetching available volunteers count:', err2);
        return res.status(500).json({ error: 'Error fetching volunteer statistics' });
      }

      db.query(recentVolunteerQuery, (err3, recentResults) => {
        if (err3) {
          console.error('Error fetching recent volunteer:', err3);
          return res.status(500).json({ error: 'Error fetching volunteer statistics' });
        }

        const statistics = {
          volunteerCount: totalResults[0]?.volunteerCount || 0,
          availableCount: availableResults[0]?.availableCount || 0,
          recentVolunteer: recentResults[0] || null
        };

        console.log('Volunteer statistics fetched successfully:', statistics); // Debug log
        res.json(statistics);
      });
    });
  });
});

// API for fetching volunteer statistics (old endpoint - keeping for compatibility)
router.get('/api/volunteer-statistics', async (req, res) => {
  try {
    // Query for the total number of volunteers
    const totalVolunteersQuery = 'SELECT COUNT(*) AS totalVolunteers FROM Volunteer';
    const [totalResults] = await db.promise().query(totalVolunteersQuery);

    // Query for the number of available volunteers
    const availableVolunteersQuery = 'SELECT COUNT(*) AS availableVolunteers FROM Volunteer WHERE AvailabilityStatus = "Available"';
    const [availableResults] = await db.promise().query(availableVolunteersQuery);

    // Query for the number of appointed (busy) volunteers
    const appointedVolunteersQuery = 'SELECT COUNT(*) AS appointedVolunteers FROM Volunteer WHERE AvailabilityStatus = "Busy"';
    const [appointedResults] = await db.promise().query(appointedVolunteersQuery);

    // Extract values safely
    const totalVolunteers = totalResults[0]?.totalVolunteers || 0;
    const availableVolunteers = availableResults[0]?.availableVolunteers || 0;
    const appointedVolunteers = appointedResults[0]?.appointedVolunteers || 0;

    // Return JSON response
    res.json({
      totalVolunteers,
      availableVolunteers,
      appointedVolunteers,
    });

  } catch (err) {
    console.error('Error fetching volunteer statistics:', err);
    res.status(500).json({ error: 'Error fetching volunteer statistics from the database' });
  }
});



// API route for adding a volunteer
router.post('/api/addVolunteer', (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: 'Request body is missing' });
  }

  let { FirstName, LastName, ContactNumber, Skills, AvailabilityStatus } = req.body;

  console.log(`Received data: ${FirstName}, ${LastName}, ${ContactNumber}, ${Skills}, ${AvailabilityStatus}`);

  if (!FirstName || !LastName || !AvailabilityStatus) {
    return res.status(400).json({ error: 'First Name, Last Name, and Availability Status are required' });
  }

  // Insert volunteer data into the Volunteer table
  const insertVolunteerQuery = `
    INSERT INTO Volunteer (FirstName, LastName, ContactNumber, Skills, AvailabilityStatus)
    VALUES (?, ?, ?, ?, ?)`;

  const volunteerValues = [FirstName, LastName, ContactNumber, Skills, AvailabilityStatus];

  db.query(insertVolunteerQuery, volunteerValues, (err, result) => {
    if (err) {
      console.error('Error inserting volunteer:', err);
      return res.status(500).json({ error: 'Failed to insert volunteer data' });
    }
    res.json({ message: 'Volunteer added successfully', id: result.insertId });
  });
});



// volunteersRoutes.js (Backend)

// API route to fetch volunteer details for editing
router.get('/api/:id', (req, res) => {
  const volunteerId = req.params.id;

  // Query to get the volunteer details from the database
  const query = 'SELECT * FROM Volunteer WHERE VolunteerID = ?';
  
  db.query(query, [volunteerId], (err, results) => {
    if (err) {
      console.error('Error fetching volunteer:', err);
      return res.status(500).json({ error: 'Failed to fetch volunteer' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    res.json(results[0]);  // Return volunteer details
  });
});

// API route to update volunteer details
router.put('/api/update/:id', (req, res) => {
  const volunteerId = req.params.id;
  const { FirstName, LastName, ContactNumber, Skills, AvailabilityStatus } = req.body;

  // Query to update volunteer details in the database
  const updateQuery = `
    UPDATE Volunteer SET 
    FirstName = ?, 
    LastName = ?, 
    ContactNumber = ?, 
    Skills = ?, 
    AvailabilityStatus = ?
    WHERE VolunteerID = ?
  `;

  db.query(updateQuery, [FirstName, LastName, ContactNumber, Skills, AvailabilityStatus, volunteerId], (err, result) => {
    if (err) {
      console.error('Error updating volunteer:', err);
      return res.status(500).json({ error: 'Failed to update volunteer' });
    }

    res.json({ message: 'Volunteer updated successfully' });
  });
});



// API route for deleting a volunteer
router.delete('/api/delete/:id', (req, res) => {
  const volunteerId = req.params.id;

  // First, find if the volunteer is associated with any other data (for example, tasks or events)
  const findVolunteerQuery = 'SELECT * FROM Volunteer WHERE VolunteerID = ?';

  db.query(findVolunteerQuery, [volunteerId], (err, results) => {
    if (err) {
      console.error('Error finding volunteer:', err);
      return res.status(500).json({ error: 'Failed to find volunteer' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    // Delete the volunteer entry
    const deleteVolunteerQuery = 'DELETE FROM Volunteer WHERE VolunteerID = ?';

    db.query(deleteVolunteerQuery, [volunteerId], (err, result) => {
      if (err) {
        console.error('Error deleting volunteer:', err);
        return res.status(500).json({ error: 'Failed to delete volunteer' });
      }

      // Optionally, you can add additional logic to check for references to this volunteer in other tables
      // (e.g., check if the volunteer is assigned to any tasks or events)

      res.json({ message: 'Volunteer deleted successfully' });
    });
  });
});

module.exports = router;



module.exports = router;