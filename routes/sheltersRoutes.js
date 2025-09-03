const express = require('express');
const path = require('path');
const db = require('../config/db'); // Import MySQL connection
const router = express.Router();


// Serve the Shelters HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'shelters.html'));
});


// Fetch all shelter data without filters
router.get('/api', (req, res) => {
  console.log('Shelters API endpoint hit'); // Debug log
  const query = `
  SELECT s.ShelterID, 
         s.Name, 
         s.Capacity, 
         s.CurrentOccupancy, 
         s.ContactNumber, 
         CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location,
         s.AvailableResources
  FROM Shelter s
  JOIN Location l ON s.LocationID = l.LocationID
  ORDER BY s.ShelterID ASC
  LIMIT 50;
`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    console.log('Shelter data fetched successfully:', results.length, 'rows'); // Debug log
    res.json(results);
  });
});

// Search shelters based on query
router.get('/api/search', (req, res) => {
  const { query } = req.query;
  console.log('Searching shelters with query:', query); // Debug log

  let sqlQuery;
  let params = [];

  if (!query) {
    // If no search query, return all shelters
    sqlQuery = `
      SELECT s.ShelterID, 
             s.Name, 
             s.Capacity, 
             s.CurrentOccupancy, 
             s.ContactNumber, 
             CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location,
             s.AvailableResources
      FROM Shelter s
      JOIN Location l ON s.LocationID = l.LocationID
      ORDER BY s.ShelterID ASC
      LIMIT 50;
    `;
  } else {
    // Search across multiple fields
    sqlQuery = `
      SELECT s.ShelterID, 
             s.Name, 
             s.Capacity, 
             s.CurrentOccupancy, 
             s.ContactNumber, 
             CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location,
             s.AvailableResources
      FROM Shelter s
      JOIN Location l ON s.LocationID = l.LocationID
      WHERE s.Name LIKE ? 
         OR s.ContactNumber LIKE ? 
         OR l.Division LIKE ? 
         OR l.District LIKE ? 
         OR l.Area LIKE ?
         OR s.AvailableResources LIKE ?
      ORDER BY s.ShelterID ASC
      LIMIT 50;
    `;
    const searchTerm = `%${query}%`;
    params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
  }

  db.query(sqlQuery, params, (err, results) => {
    if (err) {
      console.error('Database error during search:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    console.log('Search results:', results.length, 'shelters found'); // Debug log
    res.json(results);
  });
});

// Add a new shelter
router.post('/api', (req, res) => {
  const { Name, Capacity, CurrentOccupancy, ContactNumber, Division, District, Area, AvailableResources } = req.body;
  
  console.log('Adding new shelter:', req.body); // Debug log

  // First, check if the location exists or create it
  const locationQuery = `
    INSERT INTO Location (Division, District, Area) 
    VALUES (?, ?, ?) 
    ON DUPLICATE KEY UPDATE LocationID = LAST_INSERT_ID(LocationID)
  `;

  db.query(locationQuery, [Division, District, Area], (err, locationResult) => {
    if (err) {
      console.error('Error inserting/finding location:', err);
      return res.status(500).json({ error: 'Failed to create/find location', details: err.message });
    }

    const locationID = locationResult.insertId;

    // Now insert the shelter
    const shelterQuery = `
      INSERT INTO Shelter (Name, Capacity, CurrentOccupancy, ContactNumber, LocationID, AvailableResources) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(shelterQuery, [Name, Capacity, CurrentOccupancy, ContactNumber, locationID, AvailableResources], (err, result) => {
      if (err) {
        console.error('Error inserting shelter:', err);
        return res.status(500).json({ error: 'Failed to add shelter', details: err.message });
      }
      
      console.log('Shelter added successfully with ID:', result.insertId); // Debug log
      res.json({ message: 'Shelter added successfully', shelterID: result.insertId });
    });
  });
});

// Statistics endpoint for shelter data
router.get('/api/statistics', (req, res) => {
  console.log('Shelter statistics API endpoint hit'); // Debug log
  
  // Query to get total shelter count
  const totalSheltersQuery = 'SELECT COUNT(*) as shelterCount FROM Shelter';
  
  // Query to get total available capacity (sum of all shelter capacities minus current occupancy)
  const availableCapacityQuery = 'SELECT COALESCE(SUM(Capacity - COALESCE(CurrentOccupancy, 0)), 0) as availableCapacity FROM Shelter';
  
  // Query to get most recent shelter
  const recentShelterQuery = `
    SELECT s.Name, s.Capacity, 
           CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location
    FROM Shelter s
    JOIN Location l ON s.LocationID = l.LocationID
    ORDER BY s.ShelterID DESC
    LIMIT 1
  `;

  // Execute all queries
  db.query(totalSheltersQuery, (err1, totalResults) => {
    if (err1) {
      console.error('Error fetching total shelters count:', err1);
      return res.status(500).json({ error: 'Error fetching shelter statistics' });
    }

    db.query(availableCapacityQuery, (err2, capacityResults) => {
      if (err2) {
        console.error('Error fetching available capacity:', err2);
        return res.status(500).json({ error: 'Error fetching shelter statistics' });
      }

      db.query(recentShelterQuery, (err3, recentResults) => {
        if (err3) {
          console.error('Error fetching recent shelter:', err3);
          return res.status(500).json({ error: 'Error fetching shelter statistics' });
        }

        const statistics = {
          shelterCount: totalResults[0]?.shelterCount || 0,
          availableCapacity: capacityResults[0]?.availableCapacity || 0,
          recentShelter: recentResults[0] || null
        };

        console.log('Shelter statistics fetched successfully:', statistics); // Debug log
        res.json(statistics);
      });
    });
  });
});

// Get a specific shelter by ID
router.get('/api/:id', (req, res) => {
  const shelterID = req.params.id;
  console.log('Fetching shelter with ID:', shelterID); // Debug log

  const query = `
    SELECT s.ShelterID, 
           s.Name, 
           s.Capacity, 
           s.CurrentOccupancy, 
           s.ContactNumber, 
           l.Division, 
           l.District, 
           l.Area,
           s.AvailableResources
    FROM Shelter s
    JOIN Location l ON s.LocationID = l.LocationID
    WHERE s.ShelterID = ?
  `;

  db.query(query, [shelterID], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Shelter not found' });
    }
    
    console.log('Shelter found:', results[0]); // Debug log
    res.json(results[0]);
  });
});

// Update a shelter
router.put('/api/:id', (req, res) => {
  const shelterID = req.params.id;
  const { Name, Capacity, CurrentOccupancy, ContactNumber, Division, District, Area, AvailableResources } = req.body;
  
  console.log('Updating shelter with ID:', shelterID, 'Data:', req.body); // Debug log

  // First, check if the location exists or create it
  const locationQuery = `
    INSERT INTO Location (Division, District, Area) 
    VALUES (?, ?, ?) 
    ON DUPLICATE KEY UPDATE LocationID = LAST_INSERT_ID(LocationID)
  `;

  db.query(locationQuery, [Division, District, Area], (err, locationResult) => {
    if (err) {
      console.error('Error inserting/finding location:', err);
      return res.status(500).json({ error: 'Failed to create/find location', details: err.message });
    }

    const locationID = locationResult.insertId;

    // Now update the shelter
    const updateQuery = `
      UPDATE Shelter 
      SET Name = ?, Capacity = ?, CurrentOccupancy = ?, ContactNumber = ?, LocationID = ?, AvailableResources = ?
      WHERE ShelterID = ?
    `;

    db.query(updateQuery, [Name, Capacity, CurrentOccupancy, ContactNumber, locationID, AvailableResources, shelterID], (err, result) => {
      if (err) {
        console.error('Error updating shelter:', err);
        return res.status(500).json({ error: 'Failed to update shelter', details: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Shelter not found' });
      }
      
      console.log('Shelter updated successfully'); // Debug log
      res.json({ message: 'Shelter updated successfully' });
    });
  });
});

// Delete a shelter
router.delete('/api/:id', (req, res) => {
  const shelterID = req.params.id;
  console.log('Deleting shelter with ID:', shelterID); // Debug log

  const query = 'DELETE FROM Shelter WHERE ShelterID = ?';

  db.query(query, [shelterID], (err, result) => {
    if (err) {
      console.error('Error deleting shelter:', err);
      return res.status(500).json({ error: 'Failed to delete shelter', details: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Shelter not found' });
    }
    
    console.log('Shelter deleted successfully'); // Debug log
    res.json({ message: 'Shelter deleted successfully' });
  });
});

module.exports = router;
