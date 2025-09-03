const express = require('express');
const path = require('path');
const db = require('../config/db'); // Import MySQL connection
const router = express.Router();
const moment = require('moment');

// Serve the Victims HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'rescueoperations.html'));
});


router.get('/api', (req, res) => {
  const query = `
    SELECT ro.OperationID, 
           COALESCE(d.DisasterType, 'Unknown Disaster') AS DisasterName, 
           COALESCE(rt.TeamName, 'Unknown Team') AS TeamName, 
           CONCAT(
             COALESCE(l.Division, 'Unknown Division'), ', ', 
             COALESCE(l.District, 'Unknown District'), ', ', 
             COALESCE(l.Area, 'Unknown Area')
           ) AS AffectedArea, 
           ro.StartDate, 
           ro.EndDate, 
           ro.Status
    FROM RescueOperation ro
    LEFT JOIN Disaster d ON ro.DisasterID = d.DisasterID
    LEFT JOIN RescueTeam rt ON ro.TeamID = rt.TeamID
    LEFT JOIN Location l ON d.LocationID = l.LocationID
    ORDER BY ro.OperationID ASC
    LIMIT 50;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching rescue operations:', err);
      return res.status(500).send('Error fetching rescue operations from the database');
    }
    
    console.log(`Rescue operations fetched: ${results.length} records`);
    
    // Format dates for consistent frontend handling
    const formattedResults = results.map(operation => {
      return {
        ...operation,
        StartDate: operation.StartDate ? new Date(operation.StartDate).toISOString().split('T')[0] : null,
        EndDate: operation.EndDate ? new Date(operation.EndDate).toISOString().split('T')[0] : null
      };
    });
    
    res.json(formattedResults);
  });
});



router.get('/api/search', (req, res) => {
  const searchQuery = req.query.query || '';

  const query = `
    SELECT ro.OperationID, 
           d.DisasterType AS DisasterName, 
           rt.TeamName, 
           CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS AffectedArea, 
           ro.StartDate, 
           ro.EndDate, 
           ro.Status
    FROM RescueOperation ro
    JOIN Disaster d ON ro.DisasterID = d.DisasterID
    JOIN RescueTeam rt ON ro.TeamID = rt.TeamID
    JOIN Location l ON d.LocationID = l.LocationID
    WHERE LOWER(d.DisasterType) LIKE LOWER(?) 
       OR LOWER(rt.TeamName) LIKE LOWER(?) 
       OR LOWER(l.Division) LIKE LOWER(?) 
       OR LOWER(l.District) LIKE LOWER(?) 
       OR LOWER(l.Area) LIKE LOWER(?) 
       OR LOWER(ro.Status) LIKE LOWER(?)
    LIMIT 50;
  `;

  const wildcardSearch = `%${searchQuery}%`;
  const params = [wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch];

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching search results');
    }
    
    // Format dates for consistent frontend handling
    const formattedResults = results.map(operation => {
      return {
        ...operation,
        StartDate: operation.StartDate ? new Date(operation.StartDate).toISOString().split('T')[0] : null,
        EndDate: operation.EndDate ? new Date(operation.EndDate).toISOString().split('T')[0] : null
      };
    });
    
    res.json(formattedResults);
  });
});


router.post('/rescue/api/add', (req, res) => {
  if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
  }

  let { DisasterID, RescueTeam, NumberOfPeopleRescued, Status, DateOfRescue, Notes } = req.body;

  console.log(`Received data: ${DisasterID}, ${RescueTeam}, ${NumberOfPeopleRescued}, ${Status}, ${DateOfRescue}, ${Notes}`);

  if (!DisasterID || !RescueTeam || !NumberOfPeopleRescued || !Status || !DateOfRescue || !Notes) {
      return res.status(400).json({ error: 'All fields are required' });
  }

  try {
      const formattedDate = new Date(DateOfRescue).toISOString().split('T')[0];

      // Ensure the DisasterID exists
      const disasterQuery = `SELECT DisasterID FROM Disaster WHERE DisasterID = ?`;
      
      db.query(disasterQuery, [DisasterID], (err, disasterResult) => {
          if (err) {
              console.error('Error checking disaster:', err);
              return res.status(500).json({ error: 'Failed to check disaster existence' });
          }

          if (disasterResult.length === 0) {
              return res.status(400).json({ error: 'Invalid DisasterID' });
          }

          // Insert rescue operation
          const insertRescueQuery = `
              INSERT INTO RescueOperations (DisasterID, RescueTeam, NumberOfPeopleRescued, Status, DateOfRescue, Notes)
              VALUES (?, ?, ?, ?, ?, ?)`;

          const rescueValues = [DisasterID, RescueTeam, NumberOfPeopleRescued, Status, formattedDate, Notes];

          db.query(insertRescueQuery, rescueValues, (err, result) => {
              if (err) {
                  console.error('Error inserting rescue operation:', err);
                  return res.status(500).json({ error: 'Failed to insert rescue data' });
              }
              res.json({ message: 'Rescue operation added successfully', id: result.insertId });
          });
      });

  } catch (error) {
      console.error('Error processing date:', error);
      res.status(400).json({ error: 'Invalid date format' });
  }
});


// Add a new rescue operation

// Add a new rescue operation
router.post('/api/add', (req, res) => {
  if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
  }

  let { DisasterName, TeamName, StartDate, EndDate, Status, Division, District, Area } = req.body;

  console.log(`Received rescue operation data: ${DisasterName}, ${TeamName}, ${StartDate}, ${EndDate}, ${Status}, ${Division}, ${District}, ${Area}`);

  if (!DisasterName || !TeamName || !StartDate || !Status || !Division || !District || !Area) {
      return res.status(400).json({ error: 'All fields except EndDate are required' });
  }

  // Ensure StartDate and EndDate are in YYYY-MM-DD format
  try {
      const formattedStartDate = new Date(StartDate).toISOString().split('T')[0];
      const formattedEndDate = EndDate ? new Date(EndDate).toISOString().split('T')[0] : null;

      console.log('Formatted dates:', { formattedStartDate, formattedEndDate });

      // Check if location already exists using Division/District/Area
      const locationQuery = `SELECT LocationID FROM Location WHERE Division = ? AND District = ? AND Area = ?`;
      const locationValues = [Division, District, Area];

      console.log('Checking location with Division/District/Area values:', locationValues);

      db.query(locationQuery, locationValues, (err, locationResult) => {
          if (err) {
              console.error('Error checking location:', err);
              console.error('SQL Error details:', err.sqlMessage);
              return res.status(500).json({ error: 'Failed to check location: ' + err.sqlMessage });
          }

          console.log('Location check result:', locationResult);

          if (locationResult.length > 0) {
              // Location exists, use the existing LocationID
              const locationID = locationResult[0].LocationID;
              console.log('Using existing location ID:', locationID);
              checkOrInsertDisaster(locationID);
          } else {
              // Insert new location
              const insertLocationQuery = `INSERT INTO Location (Division, District, Area) VALUES (?, ?, ?)`;
              console.log('Inserting new location with values:', locationValues);
              
              db.query(insertLocationQuery, locationValues, (err, result) => {
                  if (err) {
                      console.error('Error inserting location:', err);
                      console.error('SQL Error details:', err.sqlMessage);
                      return res.status(500).json({ error: 'Failed to insert location: ' + err.sqlMessage });
                  }

                  console.log('Successfully inserted new location with ID:', result.insertId);
                  const newLocationID = result.insertId;
                  checkOrInsertDisaster(newLocationID);
              });
          }
      });

      // Function to check and insert Disaster
      function checkOrInsertDisaster(locationID) {
          console.log('Checking/inserting disaster with:', { DisasterName, locationID });
          const disasterQuery = `SELECT DisasterID FROM Disaster WHERE DisasterType = ? AND LocationID = ?`;
          const disasterValues = [DisasterName, locationID];

          db.query(disasterQuery, disasterValues, (err, disasterResult) => {
              if (err) {
                  console.error('Error checking disaster:', err);
                  console.error('SQL Error details:', err.sqlMessage);
                  return res.status(500).json({ error: 'Failed to check disaster: ' + err.sqlMessage });
              }

              console.log('Disaster check result:', disasterResult);

              if (disasterResult.length > 0) {
                  // Disaster exists, use the existing DisasterID
                  const disasterID = disasterResult[0].DisasterID;
                  console.log('Using existing disaster ID:', disasterID);
                  checkOrInsertRescueTeam(locationID, disasterID);
              } else {
                  // Insert new disaster
                  console.log('Inserting new disaster with values:', [DisasterName, locationID, formattedStartDate]);
                  const insertDisasterQuery = `INSERT INTO Disaster (DisasterType, LocationID, Date, SeverityLevel, Description) 
                      VALUES (?, ?, ?, ?, ?)`;
                  const disasterInsertValues = [DisasterName, locationID, formattedStartDate, 'Medium', 'Auto-generated from rescue operation'];

                  db.query(insertDisasterQuery, disasterInsertValues, (err, result) => {
                      if (err) {
                          console.error('Error inserting disaster:', err);
                          console.error('SQL Error details:', err.sqlMessage);
                          console.error('Query was:', insertDisasterQuery);
                          console.error('Values were:', disasterInsertValues);
                          return res.status(500).json({ error: 'Failed to insert disaster: ' + err.sqlMessage });
                      }

                      console.log('Successfully inserted new disaster with ID:', result.insertId);
                      const newDisasterID = result.insertId;
                      checkOrInsertRescueTeam(locationID, newDisasterID);
                  });
              }
          });
      }

      // Function to check and insert Rescue Team
      function checkOrInsertRescueTeam(locationID, disasterID) {
          console.log('Checking/inserting rescue team with:', { TeamName, locationID });
          const rescueTeamQuery = `SELECT TeamID FROM RescueTeam WHERE TeamName = ?`;
          const rescueTeamValues = [TeamName];

          db.query(rescueTeamQuery, rescueTeamValues, (err, rescueTeamResult) => {
              if (err) {
                  console.error('Error checking rescue team:', err);
                  console.error('SQL Error details:', err.sqlMessage);
                  return res.status(500).json({ error: 'Failed to check rescue team: ' + err.sqlMessage });
              }

              console.log('Rescue team check result:', rescueTeamResult);

              if (rescueTeamResult.length > 0) {
                  // Rescue team exists, use the existing TeamID
                  const teamID = rescueTeamResult[0].TeamID;
                  console.log('Using existing team ID:', teamID);
                  insertRescueOperation(disasterID, teamID);
              } else {
                  // Generate a shorter unique contact number to fit database constraints (typically 11-15 chars max)
                  const uniqueContactNumber = `99${Date.now() % 1000000000}`;
                  
                  // Insert new rescue team with correct table structure
                  console.log('Inserting new rescue team with values:', [TeamName, 'General', uniqueContactNumber, locationID]);
                  const insertRescueTeamQuery = `INSERT INTO RescueTeam (TeamName, Specialization, ContactNumber, LocationID) 
                      VALUES (?, ?, ?, ?)`;
                  const rescueTeamInsertValues = [TeamName, 'General', uniqueContactNumber, locationID];

                  db.query(insertRescueTeamQuery, rescueTeamInsertValues, (err, result) => {
                      if (err) {
                          console.error('Error inserting rescue team:', err);
                          console.error('SQL Error details:', err.sqlMessage);
                          return res.status(500).json({ error: 'Failed to insert rescue team: ' + err.sqlMessage });
                      }

                      console.log('Successfully inserted new rescue team with ID:', result.insertId);
                      const newTeamID = result.insertId;
                      insertRescueOperation(disasterID, newTeamID);
                  });
              }
          });
      }

      // Function to insert the rescue operation using the obtained TeamID and DisasterID
      function insertRescueOperation(disasterID, teamID) {
          console.log('Inserting rescue operation with:', { disasterID, teamID, formattedStartDate, formattedEndDate, Status });
          const insertRescueOperationQuery = `
              INSERT INTO RescueOperation (DisasterID, TeamID, StartDate, EndDate, Status)
              VALUES (?, ?, ?, ?, ?)`;

          const rescueOperationValues = [disasterID, teamID, formattedStartDate, formattedEndDate, Status];

          db.query(insertRescueOperationQuery, rescueOperationValues, (err, result) => {
              if (err) {
                  console.error('Error inserting rescue operation:', err);
                  console.error('SQL Error details:', err.sqlMessage);
                  return res.status(500).json({ error: 'Failed to insert rescue operation data: ' + err.sqlMessage });
              }
              console.log('Successfully inserted rescue operation with ID:', result.insertId);
              res.json({ message: 'Rescue operation added successfully', id: result.insertId });
          });
      }
  } catch (error) {
      console.error('Error processing date:', error);
      res.status(400).json({ error: 'Invalid date format' });
  }
});


// Statistics endpoint for rescue operation data
router.get('/api/statistics', (req, res) => {
  console.log('Rescue operation statistics API endpoint hit'); // Debug log
  
  // Query to get total rescue operation count
  const totalOperationsQuery = 'SELECT COUNT(*) as operationCount FROM RescueOperation';
  
  // Query to get active rescue operations count (assuming 'Active' or 'In Progress' status means active)
  const activeOperationsQuery = "SELECT COUNT(*) as activeOperationCount FROM RescueOperation WHERE Status IN ('Active', 'In Progress', 'Ongoing')";
  
  // Query to get most recent rescue operation
  const recentOperationQuery = `
    SELECT d.DisasterType AS DisasterName, ro.Status, 
           CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS AffectedArea
    FROM RescueOperation ro
    JOIN Disaster d ON ro.DisasterID = d.DisasterID
    JOIN Location l ON d.LocationID = l.LocationID
    ORDER BY ro.OperationID DESC
    LIMIT 1
  `;

  // Execute all queries
  db.query(totalOperationsQuery, (err1, totalResults) => {
    if (err1) {
      console.error('Error fetching total rescue operations count:', err1);
      return res.status(500).json({ error: 'Error fetching rescue operation statistics' });
    }

    db.query(activeOperationsQuery, (err2, activeResults) => {
      if (err2) {
        console.error('Error fetching active rescue operations count:', err2);
        return res.status(500).json({ error: 'Error fetching rescue operation statistics' });
      }

      db.query(recentOperationQuery, (err3, recentResults) => {
        if (err3) {
          console.error('Error fetching recent rescue operation:', err3);
          return res.status(500).json({ error: 'Error fetching rescue operation statistics' });
        }

        const statistics = {
          operationCount: totalResults[0]?.operationCount || 0,
          activeOperationCount: activeResults[0]?.activeOperationCount || 0,
          recentOperation: recentResults[0] || null
        };

        console.log('Rescue operation statistics fetched successfully:', statistics); // Debug log
        res.json(statistics);
      });
    });
  });
});

// Get rescue operation by ID
router.get('/api/:id', (req, res) => {
  const rescueOperationId = req.params.id;
  console.log('Fetching rescue operation details for ID:', rescueOperationId);

  const query = `
    SELECT ro.OperationID, ro.StartDate, ro.EndDate, ro.Status, 
           t.TeamName, 
           d.DisasterType AS DisasterName, 
           l.Division, l.District, l.Area
    FROM RescueOperation ro
    JOIN Disaster d ON ro.DisasterID = d.DisasterID
    JOIN RescueTeam t ON ro.TeamID = t.TeamID
    JOIN Location l ON d.LocationID = l.LocationID
    WHERE ro.OperationID = ?;
  `;

  db.query(query, [rescueOperationId], (err, results) => {
    if (err) {
      console.error('Error fetching rescue operation:', err);
      console.error('SQL Error details:', err.sqlMessage);
      return res.status(500).json({ error: 'Error fetching rescue operation data: ' + err.sqlMessage });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Rescue operation not found' });
    }
    
    // Format dates for consistent frontend handling
    const result = results[0];
    if (result.StartDate) {
      result.StartDate = new Date(result.StartDate).toISOString().split('T')[0];
    }
    if (result.EndDate) {
      result.EndDate = new Date(result.EndDate).toISOString().split('T')[0];
    }
    
    console.log('Rescue operation found with formatted dates:', result);
    res.json(result);
  });
});

// Update rescue operation
router.put('/api/update/:id', (req, res) => {
  const rescueOperationId = req.params.id;
  console.log('Updating rescue operation:', rescueOperationId);
  const { DisasterName, TeamName, StartDate, EndDate, Status, Division, District, Area } = req.body;

  console.log('Update data received:', { DisasterName, TeamName, StartDate, EndDate, Status, Division, District, Area });

  if (!DisasterName || !TeamName || !StartDate || !Status || !Division || !District || !Area) {
    return res.status(400).json({ error: 'All fields except EndDate are required' });
  }

  try {
    const formattedStartDate = new Date(StartDate).toISOString().split('T')[0];
    const formattedEndDate = EndDate ? new Date(EndDate).toISOString().split('T')[0] : null;

    // Find LocationID using Division/District/Area
    const locationQuery = `SELECT LocationID FROM Location WHERE Division = ? AND District = ? AND Area = ?`;
    const locationValues = [Division, District, Area];

    console.log('Looking for location with values:', locationValues);

    db.query(locationQuery, locationValues, (err, locationResult) => {
      if (err) {
        console.error('Error checking location:', err);
        console.error('SQL Error details:', err.sqlMessage);
        return res.status(500).json({ error: 'Failed to check location: ' + err.sqlMessage });
      }

      console.log('Location search result:', locationResult);

      if (locationResult.length > 0) {
        const locationID = locationResult[0].LocationID;
        console.log('Found location ID:', locationID);
        updateDisasterAndTeam(locationID);
      } else {
        console.log('Location not found, creating new location');
        // Insert new location if it doesn't exist
        const insertLocationQuery = `INSERT INTO Location (Division, District, Area) VALUES (?, ?, ?)`;
        
        db.query(insertLocationQuery, locationValues, (err, result) => {
          if (err) {
            console.error('Error inserting location:', err);
            console.error('SQL Error details:', err.sqlMessage);
            return res.status(500).json({ error: 'Failed to insert location: ' + err.sqlMessage });
          }
          
          console.log('Created new location with ID:', result.insertId);
          const newLocationID = result.insertId;
          updateDisasterAndTeam(newLocationID);
        });
      }
    });

    // Update disaster and rescue team
    function updateDisasterAndTeam(locationID) {
      console.log('Updating disaster and rescue team with locationID:', locationID);
      const updateDisasterQuery = `
        UPDATE Disaster 
        SET DisasterType = ?, LocationID = ?, Date = ? 
        WHERE DisasterID = (SELECT DisasterID FROM RescueOperation WHERE OperationID = ?)
      `;
      console.log('Disaster update values:', DisasterName, locationID, formattedStartDate, rescueOperationId);
      db.query(updateDisasterQuery, [DisasterName, locationID, formattedStartDate, rescueOperationId], (err) => {
        if (err) {
          console.error('Error updating disaster:', err);
          console.error('SQL Error details:', err.sqlMessage);
          return res.status(500).json({ error: 'Failed to update disaster: ' + err.sqlMessage });
        }

        const updateRescueTeamQuery = `
          UPDATE RescueTeam 
          SET TeamName = ? 
          WHERE TeamID = (SELECT TeamID FROM RescueOperation WHERE OperationID = ?)
        `;

        db.query(updateRescueTeamQuery, [TeamName, rescueOperationId], (err) => {
          if (err) {
            console.error('Error updating rescue team:', err);
            console.error('SQL Error details:', err.sqlMessage);
            return res.status(500).json({ error: 'Failed to update rescue team: ' + err.sqlMessage });
          }

          const updateRescueOperationQuery = `
            UPDATE RescueOperation 
            SET StartDate = ?, EndDate = ?, Status = ? 
            WHERE OperationID = ?
          `;
  
          db.query(updateRescueOperationQuery, [formattedStartDate, formattedEndDate, Status, rescueOperationId], (err) => {
            if (err) {
              console.error('Error updating rescue operation:', err);
              console.error('SQL Error details:', err.sqlMessage);
              return res.status(500).json({ error: 'Failed to update rescue operation: ' + err.sqlMessage });
            }
            console.log('Rescue operation updated successfully');
            res.json({ message: 'Rescue operation updated successfully' });
          });
        });
      });
    }
  } catch (error) {
    console.error('Error processing date:', error);
    res.status(400).json({ error: 'Invalid date format' });
  }
});



// Delete a rescue operation (without deleting disaster or location)
router.delete('/api/delete/:id', (req, res) => {
  const rescueOperationId = req.params.id;

  // Delete the rescue operation entry
  const deleteRescueOperationQuery = 'DELETE FROM RescueOperation WHERE OperationID = ?';

  db.query(deleteRescueOperationQuery, [rescueOperationId], (err, result) => {
    if (err) {
      console.error('Error deleting rescue operation:', err);
      return res.status(500).json({ error: 'Failed to delete rescue operation' });
    }

    // If the deletion is successful
    res.json({ message: 'Rescue operation deleted successfully' });
  });
});


module.exports = router;