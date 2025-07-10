const express = require('express');
const path = require('path');
const db = require('../config/db'); // Import MySQL connection
const router = express.Router();
const moment = require('moment');

// Serve the Disasters HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'disasters.html'));
});


// Fetch all disaster data without filters
router.get('/api', (req, res) => {
  //const query = 'SELECT * FROM Disaster LIMIT 50'; // Fetch all disasters with limit of 50
  const query = `
  SELECT d.DisasterID, 
         d.\`Disaster Type\` AS DisasterType, 
         CONCAT(l.City, ', ', l.State, ', ', l.Country) AS Location, 
         d.\`Date\` AS DateOccurred, 
         d.\`Severity Level\` AS SeverityLevel, 
         d.Description
  FROM Disaster d
  JOIN Location l ON d.LocationID = l.LocationID
  LIMIT 50;
`;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching data from the database');
    }
    res.json(results); // Send the fetched data as JSON to the frontend
  });
});


router.get('/api/search', (req, res) => {
  const searchQuery = req.query.query || '';  // Default empty string

  let query = `
  SELECT d.DisasterID, 
         d.\`Disaster Type\` AS DisasterType, 
         CONCAT(l.City, ', ', l.State, ', ', l.Country) AS Location, 
         d.\`Date\` AS DateOccurred, 
         d.\`Severity Level\` AS SeverityLevel, 
         d.Description
  FROM Disaster d
  JOIN Location l ON d.LocationID = l.LocationID
  WHERE LOWER(d.\`Disaster Type\`) LIKE LOWER(?) 
     OR LOWER(CONCAT(l.Country, ', ', l.State, ', ', l.City)) LIKE LOWER(?)
     OR LOWER(d.Description) LIKE LOWER(?)
     OR LOWER(d.\`Severity Level\`) LIKE LOWER(?)
  LIMIT 50;
`;

  
  const wildcardSearch = `%${searchQuery}%`;
  const params = [wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch];

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching data from the database');
    }
    res.json(results); // Send data back to frontend
  });
});



// API for fetching disaster statistics
router.get('/api/statistics', async (req, res) => {
  try {
    // Query for the total number of disasters
    const countQuery = 'SELECT COUNT(*) AS disasterCount FROM Disaster';
    const [countResults] = await db.promise().query(countQuery);
   
    // Query for the total number of unique affected areas (locations) (Fix: Use LocationID instead)
    const uniqueLocationQuery = 'SELECT COUNT(DISTINCT LocationID) AS affectedAreaCount FROM Disaster';
    const [locationResults] = await db.promise().query(uniqueLocationQuery);

    // Query for the most recent disaster
    const recentDisasterQuery = `
      SELECT d.\`Disaster Type\` AS DisasterType, 
             CONCAT(l.City, ', ', l.State, ', ', l.Country) AS Location, 
             d.\`Date\` AS DateOccurred
      FROM Disaster d
      JOIN Location l ON d.LocationID = l.LocationID
      ORDER BY d.\`Date\` DESC
      LIMIT 1;
    `;
    const [recentResults] = await db.promise().query(recentDisasterQuery);

    // Extract values safely
    const disasterCount = countResults[0]?.disasterCount || 0;
    const affectedAreaCount = locationResults[0]?.affectedAreaCount || 0;
    const recentDisaster = recentResults.length ? recentResults[0] : null;
    
    if (recentDisaster) {
      recentDisaster.DateOccurred = moment(recentDisaster.DateOccurred).format('DD MMM, YYYY');
    }

    // Return JSON response
    res.json({
      disasterCount,
      affectedAreaCount,
      recentDisaster: recentDisaster
        ? {
            DisasterType: recentDisaster.DisasterType,
            Location: recentDisaster.Location,
            DateOccurred: recentDisaster.DateOccurred,
          }
        : null,
    });

  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ error: 'Error fetching statistics from the database' });
  }
});



router.post('/api/add', (req, res) => {
  if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
  }

  let { DisasterType, City, State, Country, DateOccurred, SeverityLevel, Description } = req.body;

  console.log(`Received data: ${DisasterType}, ${City}, ${State}, ${Country}, ${DateOccurred}, ${SeverityLevel}, ${Description}`);

  if (!DisasterType || !City || !State || !Country || !DateOccurred || !SeverityLevel || !Description) {
      return res.status(400).json({ error: 'All fields are required' });
  }

  // Ensure DateOccurred is in YYYY-MM-DD format
  try {
      const formattedDate = new Date(DateOccurred).toISOString().split('T')[0];

      // Check if location already exists
      const locationQuery = `SELECT LocationID FROM Location WHERE City = ? AND State = ? AND Country = ?`;
      const locationValues = [City, State, Country];

      db.query(locationQuery, locationValues, (err, locationResult) => {
          if (err) {
              console.error('Error checking location:', err);
              return res.status(500).json({ error: 'Failed to check location' });
          }

          if (locationResult.length > 0) {
              // Location exists, use the existing LocationID
              const locationID = locationResult[0].LocationID;
              insertDisaster(locationID);
          } else {
              // Insert new location
              const insertLocationQuery = `INSERT INTO Location (City, State, Country) VALUES (?, ?, ?)`;
              
              db.query(insertLocationQuery, locationValues, (err, result) => {
                  if (err) {
                      console.error('Error inserting location:', err);
                      return res.status(500).json({ error: 'Failed to insert location' });
                  }

                  const newLocationID = result.insertId;
                  insertDisaster(newLocationID);
              });
          }
      });

      // Function to insert the disaster using the obtained LocationID
      function insertDisaster(locationID) {
          const insertDisasterQuery = `
              INSERT INTO Disaster (\`Disaster Type\`, LocationID, \`Date\`, \`Severity Level\`, Description)
              VALUES (?, ?, ?, ?, ?)`;

          const disasterValues = [DisasterType, locationID, formattedDate, SeverityLevel, Description];

          db.query(insertDisasterQuery, disasterValues, (err, result) => {
              if (err) {
                  console.error('Error inserting disaster:', err);
                  return res.status(500).json({ error: 'Failed to insert disaster data' });
              }
              res.json({ message: 'Disaster added successfully', id: result.insertId });
          });
      }
  } catch (error) {
      console.error('Error processing date:', error);
      res.status(400).json({ error: 'Invalid date format' });
  }
});


router.get('/api/:id', (req, res) => {
  const disasterId = req.params.id;
  
  const query = `
    SELECT d.DisasterID, d.\`Disaster Type\` AS DisasterType, d.\`Date\` AS DateOccurred, d.\`Severity Level\` AS SeverityLevel, d.Description, 
           l.City, l.State, l.Country
    FROM Disaster d
    JOIN Location l ON d.LocationID = l.LocationID
    WHERE d.DisasterID = ?;
  `;

  db.query(query, [disasterId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching disaster data' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    res.json(results[0]);
  });
});


router.put('/api/update/:id', (req, res) => {
  const disasterId = req.params.id;
  const { DisasterType, City, State, Country, DateOccurred, SeverityLevel, Description } = req.body;

  if (!DisasterType || !City || !State || !Country || !DateOccurred || !SeverityLevel || !Description) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const formattedDate = new Date(DateOccurred).toISOString().split('T')[0];

  // Update Location Table First
  const updateLocationQuery = `
    UPDATE Location 
    SET City = ?, State = ?, Country = ? 
    WHERE LocationID = (SELECT LocationID FROM Disaster WHERE DisasterID = ?);
  `;

  db.query(updateLocationQuery, [City, State, Country, disasterId], (err, result) => {
    if (err) {
      console.error('Error updating location:', err);
      return res.status(500).json({ error: 'Failed to update location data' });
    }

    // Now update Disaster Table
    const updateDisasterQuery = `
      UPDATE Disaster 
      SET \`Disaster Type\` = ?, \`Date\` = ?, \`Severity Level\` = ?, Description = ?
      WHERE DisasterID = ?;
    `;

    db.query(updateDisasterQuery, [DisasterType, formattedDate, SeverityLevel, Description, disasterId], (err, result) => {
      if (err) {
        console.error('Error updating disaster:', err);
        return res.status(500).json({ error: 'Failed to update disaster data' });
      }
      res.json({ message: 'Disaster updated successfully' });
    });
  });
});


// Deleting a disaster and removing associated location if no other disasters reference it
router.delete('/api/delete/:id', (req, res) => {
  const disasterId = req.params.id;

  // First, find the LocationID associated with the disaster
  const findLocationQuery = 'SELECT LocationID FROM Disaster WHERE DisasterID = ?';

  db.query(findLocationQuery, [disasterId], (err, results) => {
    if (err) {
      console.error('Error finding location:', err);
      return res.status(500).json({ error: 'Failed to find location data' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    const locationId = results[0].LocationID;

    // Delete the disaster entry
    const deleteDisasterQuery = 'DELETE FROM Disaster WHERE DisasterID = ?';

    db.query(deleteDisasterQuery, [disasterId], (err, result) => {
      if (err) {
        console.error('Error deleting disaster:', err);
        return res.status(500).json({ error: 'Failed to delete disaster' });
      }

      // Check if the location is still referenced by any other disaster
      const checkLocationQuery = 'SELECT COUNT(*) AS count FROM Disaster WHERE LocationID = ?';

      db.query(checkLocationQuery, [locationId], (err, locationResult) => {
        if (err) {
          console.error('Error checking location reference:', err);
          return res.status(500).json({ error: 'Failed to check location reference' });
        }

        if (locationResult[0].count === 0) {
          // If no other disasters reference this location, delete it
          const deleteLocationQuery = 'DELETE FROM Location WHERE LocationID = ?';

          db.query(deleteLocationQuery, [locationId], (err, locationDeleteResult) => {
            if (err) {
              console.error('Error deleting location:', err);
              return res.status(500).json({ error: 'Failed to delete location' });
            }
            res.json({ message: 'Disaster and associated location deleted successfully' });
          });
        } else {
          res.json({ message: 'Disaster deleted successfully' });
        }
      });
    });
  });
});






console.log('It is working');
  
module.exports = router;
