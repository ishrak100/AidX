const express = require('express');
const path = require('path');
const db = require('../config/db'); // Import MySQL connection
const router = express.Router();


// Serve the Victims HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'victims.html'));
});


// Fetch all victim data without filters
router.get('/api', (req, res) => {
  console.log('Victims API endpoint hit'); // Debug log
  const query = `
  SELECT v.VictimID, 
         v.FirstName, 
         v.LastName, 
         v.Age, 
         v.Gender, 
         v.ContactNumber, 
         v.Address, 
         v.Status, 
         CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location
  FROM Victim v
  JOIN Location l ON v.LocationID = l.LocationID
  LIMIT 50;
`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error in victims API:', err);
      return res.status(500).send('Error fetching victim data from the database');
    }
    console.log('Victims fetched successfully:', results.length); // Debug log
    res.json(results); // Send the fetched data as JSON to the frontend
  });
});



// Search victims based on query
router.get('/api/search', (req, res) => {
  const searchQuery = req.query.query || '';  // Default empty string

  let query = `
  SELECT v.VictimID, 
         v.FirstName, 
         v.LastName, 
         v.Age, 
         v.Gender, 
         v.ContactNumber, 
         v.Address, 
         v.Status, 
         CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location
  FROM Victim v
  JOIN Location l ON v.LocationID = l.LocationID
  WHERE LOWER(v.VictimID) LIKE LOWER(?) 
     OR LOWER(v.FirstName) LIKE LOWER(?) 
     OR LOWER(v.LastName) LIKE LOWER(?) 
     OR LOWER(v.Age) LIKE LOWER(?) 
     OR LOWER(v.Gender) LIKE LOWER(?) 
     OR LOWER(v.ContactNumber) LIKE LOWER(?) 
     OR LOWER(v.Address) LIKE LOWER(?) 
     OR LOWER(v.Status) LIKE LOWER(?) 
     OR LOWER(CONCAT(l.Division, ', ', l.District, ', ', l.Area)) LIKE LOWER(?)
  LIMIT 50;
`;

  const wildcardSearch = `%${searchQuery}%`;
  const params = [
    wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch,
    wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch
  ];

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching data from the database');
    }
    res.json(results); // Send data back to frontend
  });
});


// API route for adding a victim
router.post('/api/addVictim', (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: 'Request body is missing' });
  }

  let { FirstName, LastName, Age, Gender, ContactNumber, Address, Status, Division, District, Area } = req.body;

  console.log(`Received data: ${FirstName}, ${LastName}, ${Age}, ${Gender}, ${ContactNumber}, ${Address}, ${Status}, ${Division}, ${District}, ${Area}`);

  if (!FirstName || !LastName || !Age || !Gender || !Status || !Division || !District || !Area) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }

  // Debug: Log the data being sent
  console.log('Victim form data received:', { FirstName, LastName, Age, Gender, ContactNumber, Address, Status, Division, District, Area });

  // Try multiple possible column configurations
  async function tryLocationQuery() {
    const locationValues = [Division, District, Area];
    
    // First try: Division, District, Area
    try {
      const divisionQuery = `SELECT LocationID FROM Location WHERE Division = ? AND District = ? AND Area = ?`;
      console.log('Trying Division/District/Area query:', divisionQuery);
      
      const result = await new Promise((resolve, reject) => {
        db.query(divisionQuery, locationValues, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      
      if (result.length > 0) {
        console.log('Found location with Division/District/Area:', result[0].LocationID);
        return { found: true, locationID: result[0].LocationID };
      } else {
        // Try to insert with Division/District/Area
        const insertQuery = `INSERT INTO Location (Division, District, Area) VALUES (?, ?, ?)`;
        const insertResult = await new Promise((resolve, reject) => {
          db.query(insertQuery, locationValues, (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
        console.log('Inserted new location with Division/District/Area:', insertResult.insertId);
        return { found: true, locationID: insertResult.insertId };
      }
    } catch (error1) {
      console.log('Division/District/Area failed, trying City/State/Country:', error1.message);
      
      // Second try: City, State, Country
      try {
        const cityQuery = `SELECT LocationID FROM Location WHERE City = ? AND State = ? AND Country = ?`;
        console.log('Trying City/State/Country query:', cityQuery);
        
        const result = await new Promise((resolve, reject) => {
          db.query(cityQuery, locationValues, (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
        
        if (result.length > 0) {
          console.log('Found location with City/State/Country:', result[0].LocationID);
          return { found: true, locationID: result[0].LocationID };
        } else {
          // Try to insert with City/State/Country
          const insertQuery = `INSERT INTO Location (City, State, Country) VALUES (?, ?, ?)`;
          const insertResult = await new Promise((resolve, reject) => {
            db.query(insertQuery, locationValues, (err, results) => {
              if (err) reject(err);
              else resolve(results);
            });
          });
          console.log('Inserted new location with City/State/Country:', insertResult.insertId);
          return { found: true, locationID: insertResult.insertId };
        }
      } catch (error2) {
        console.error('Both location methods failed:', error1.message, error2.message);
        return { found: false, error: error2.message };
      }
    }
  }

  tryLocationQuery()
    .then(result => {
      if (result.found) {
        insertVictim(result.locationID);
      } else {
        res.status(500).json({ error: 'Failed to handle location: ' + result.error });
      }
    })
    .catch(error => {
      console.error('Location query failed:', error);
      res.status(500).json({ error: 'Failed to check location: ' + error.message });
    });

  // Function to insert the victim using the obtained LocationID
  function insertVictim(locationID) {
    // Provide default values for optional fields
    const finalContactNumber = ContactNumber || 'N/A';
    const finalAddress = Address || 'Not provided';
    
    console.log('Inserting victim with LocationID:', locationID);
    console.log('Victim data:', { FirstName, LastName, Age, Gender, finalContactNumber, finalAddress, Status });
    
    const insertVictimQuery = `
      INSERT INTO Victim (FirstName, LastName, Age, Gender, ContactNumber, Address, Status, LocationID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const victimValues = [FirstName, LastName, Age, Gender, finalContactNumber, finalAddress, Status, locationID];

    db.query(insertVictimQuery, victimValues, (err, result) => {
      if (err) {
        console.error('Error inserting victim:', err);
        console.error('SQL Error details:', err.sqlMessage);
        return res.status(500).json({ error: 'Failed to insert victim data: ' + err.sqlMessage });
      }
      console.log('Victim inserted successfully with ID:', result.insertId);
      res.json({ message: 'Victim added successfully', id: result.insertId });
    });
  }
});


// Statistics endpoint for victim data
router.get('/api/statistics', (req, res) => {
  console.log('=== Victim statistics API endpoint hit ==='); // Debug log
  
  // Query to get total victim count
  const totalVictimsQuery = 'SELECT COUNT(*) as victimCount FROM Victim';
  
  // Query to get rescued victims count (assuming 'Rescued' status means rescued)
  const rescuedVictimsQuery = "SELECT COUNT(*) as rescuedCount FROM Victim WHERE Status = 'Rescued'";
  
  // Query to get most recent victim
  const recentVictimQuery = `
    SELECT v.FirstName, v.LastName, v.Status, 
           CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location
    FROM Victim v
    JOIN Location l ON v.LocationID = l.LocationID
    ORDER BY v.VictimID DESC
    LIMIT 1
  `;

  // Execute all queries
  db.query(totalVictimsQuery, (err1, totalResults) => {
    if (err1) {
      console.error('Error fetching total victims count:', err1);
      return res.status(500).json({ error: 'Error fetching victim statistics' });
    }
    
    console.log('Total victims count:', totalResults[0]?.victimCount); // Debug log

    db.query(rescuedVictimsQuery, (err2, rescuedResults) => {
      if (err2) {
        console.error('Error fetching rescued victims count:', err2);
        return res.status(500).json({ error: 'Error fetching victim statistics' });
      }
      
      console.log('Rescued victims count:', rescuedResults[0]?.rescuedCount); // Debug log

      db.query(recentVictimQuery, (err3, recentResults) => {
        if (err3) {
          console.error('Error fetching recent victim:', err3);
          const statistics = {
            victimCount: totalResults[0]?.victimCount || 0,
            rescuedCount: rescuedResults[0]?.rescuedCount || 0,
            recentVictim: null
          };
          return res.json(statistics);
        }

        const statistics = {
          victimCount: totalResults[0]?.victimCount || 0,
          rescuedCount: rescuedResults[0]?.rescuedCount || 0,
          recentVictim: recentResults[0] || null
        };

        console.log('=== Final statistics object ===:', statistics); // Debug log
        res.json(statistics);
      });
    });
  });
});

// Fetch a single victim
router.get('/api/:id', (req, res) => {
  const victimId = req.params.id;
  console.log('Fetching victim details for ID:', victimId);

  // Try both schema variations to support database inconsistencies
  async function fetchVictimData() {
    try {
      // First try: Division, District, Area schema
      const divisionQuery = `
        SELECT v.VictimID, v.FirstName, v.LastName, v.Age, v.Gender, 
               v.ContactNumber, v.Address, v.Status, 
               l.Division, l.District, l.Area
        FROM Victim v
        JOIN Location l ON v.LocationID = l.LocationID
        WHERE v.VictimID = ?;
      `;

      const result1 = await new Promise((resolve, reject) => {
        db.query(divisionQuery, [victimId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (result1.length > 0) {
        console.log('Victim found with Division/District/Area schema:', result1[0]);
        return result1[0];
      }
      
      throw new Error('No results with Division schema');
    } catch (error1) {
      console.log('Division schema failed, trying City/State/Country:', error1.message);
      
      try {
        // Second try: City, State, Country schema
        const cityQuery = `
          SELECT v.VictimID, v.FirstName, v.LastName, v.Age, v.Gender, 
                 v.ContactNumber, v.Address, v.Status, 
                 l.City, l.State, l.Country
          FROM Victim v
          JOIN Location l ON v.LocationID = l.LocationID
          WHERE v.VictimID = ?;
        `;

        const result2 = await new Promise((resolve, reject) => {
          db.query(cityQuery, [victimId], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        if (result2.length > 0) {
          console.log('Victim found with City/State/Country schema:', result2[0]);
          return result2[0];
        }
        
        throw new Error('Victim not found in either schema');
      } catch (error2) {
        throw new Error(`Failed to fetch victim with both schemas: ${error1.message}, ${error2.message}`);
      }
    }
  }

  fetchVictimData()
    .then(victimData => {
      res.json(victimData);
    })
    .catch(error => {
      console.error('Error fetching victim:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'Victim not found' });
      } else {
        res.status(500).json({ error: 'Error fetching victim data: ' + error.message });
      }
    });
});

// Update a victim and associated location
router.put('/api/update/:id', (req, res) => {
  const victimId = req.params.id;
  const { FirstName, LastName, Age, Gender, ContactNumber, Address, Status, Division, District, Area } = req.body;

  console.log('Updating victim ID:', victimId, 'with data:', { FirstName, LastName, Age, Gender, ContactNumber, Address, Status, Division, District, Area });

  if (!FirstName || !LastName || !Age || !Gender || !Status || !Division || !District || !Area) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }

  // Try updating location with both schema variations
  async function updateLocationData() {
    const locationValues = [Division, District, Area, victimId];
    
    try {
      // First try: Division, District, Area schema
      const divisionUpdateQuery = `
        UPDATE Location 
        SET Division = ?, District = ?, Area = ? 
        WHERE LocationID = (SELECT LocationID FROM Victim WHERE VictimID = ?);
      `;
      
      console.log('Trying to update with Division/District/Area schema');
      const result1 = await new Promise((resolve, reject) => {
        db.query(divisionUpdateQuery, locationValues, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      
      if (result1.affectedRows > 0) {
        console.log('Location updated successfully with Division/District/Area schema');
        return { success: true };
      }
      
      throw new Error('No rows affected with Division schema');
    } catch (error1) {
      console.log('Division schema failed, trying City/State/Country:', error1.message);
      
      try {
        // Second try: City, State, Country schema
        const cityUpdateQuery = `
          UPDATE Location 
          SET City = ?, State = ?, Country = ? 
          WHERE LocationID = (SELECT LocationID FROM Victim WHERE VictimID = ?);
        `;
        
        const result2 = await new Promise((resolve, reject) => {
          db.query(cityUpdateQuery, locationValues, (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
        
        if (result2.affectedRows > 0) {
          console.log('Location updated successfully with City/State/Country schema');
          return { success: true };
        }
        
        throw new Error('No rows affected with City schema');
      } catch (error2) {
        throw new Error(`Failed to update location with both schemas: ${error1.message}, ${error2.message}`);
      }
    }
  }

  updateLocationData()
    .then(() => {
      // Now update Victim Table
      const updateVictimQuery = `
        UPDATE Victim 
        SET FirstName = ?, LastName = ?, Age = ?, Gender = ?, 
            ContactNumber = ?, Address = ?, Status = ?
        WHERE VictimID = ?;
      `;

      db.query(updateVictimQuery, [FirstName, LastName, Age, Gender, ContactNumber, Address, Status, victimId], (err, result) => {
        if (err) {
          console.error('Error updating victim:', err);
          return res.status(500).json({ error: 'Failed to update victim data: ' + err.message });
        }
        console.log('Victim updated successfully');
        res.json({ message: 'Victim updated successfully' });
      });
    })
    .catch(error => {
      console.error('Error updating location:', error);
      res.status(500).json({ error: 'Failed to update location data: ' + error.message });
    });
});



// Delete a victim and associated location
router.delete('/api/delete/:id', (req, res) => {
  const victimId = req.params.id;

  // Find the LocationID associated with the victim
  const findLocationQuery = 'SELECT LocationID FROM Victim WHERE VictimID = ?';

  db.query(findLocationQuery, [victimId], (err, results) => {
    if (err) {
      console.error('Error finding location:', err);
      return res.status(500).json({ error: 'Failed to find location data' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Victim not found' });
    }

    const locationId = results[0].LocationID;

    // Delete the victim entry
    const deleteVictimQuery = 'DELETE FROM Victim WHERE VictimID = ?';

    db.query(deleteVictimQuery, [victimId], (err, result) => {
      if (err) {
        console.error('Error deleting victim:', err);
        return res.status(500).json({ error: 'Failed to delete victim' });
      }

      // Check if the location is still referenced by any other victims
      const checkLocationQuery = 'SELECT COUNT(*) AS count FROM Victim WHERE LocationID = ?';

      db.query(checkLocationQuery, [locationId], (err, locationResult) => {
        if (err) {
          console.error('Error checking location reference:', err);
          return res.status(500).json({ error: 'Failed to check location reference' });
        }

        if (locationResult[0].count === 0) {
          // If no other victims reference this location, delete it
          const deleteLocationQuery = 'DELETE FROM Location WHERE LocationID = ?';

          db.query(deleteLocationQuery, [locationId], (err, locationDeleteResult) => {
            if (err) {
              console.error('Error deleting location:', err);
              return res.status(500).json({ error: 'Failed to delete location' });
            }
            res.json({ message: 'Victim and associated location deleted successfully' });
          });
        } else {
          res.json({ message: 'Victim deleted successfully' });
        }
      });
    });
  });
});

// Temporary route to renumber VictimIDs sequentially
router.post('/api/renumber-ids', (req, res) => {
  console.log('Renumbering VictimIDs...');
  
  // First, get all victims ordered by current VictimID
  const selectQuery = `SELECT VictimID FROM Victim ORDER BY VictimID`;
  
  db.query(selectQuery, (err, victims) => {
    if (err) {
      console.error('Error fetching victims for renumbering:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    // Disable foreign key checks temporarily
    const disableFKQuery = 'SET FOREIGN_KEY_CHECKS = 0';
    
    db.query(disableFKQuery, (err) => {
      if (err) {
        console.error('Error disabling foreign key checks:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      // Create a temporary table to store the mapping
      const createTempTableQuery = `
        CREATE TEMPORARY TABLE victim_id_mapping (
          old_id INT,
          new_id INT
        )
      `;
      
      db.query(createTempTableQuery, (err) => {
        if (err) {
          console.error('Error creating temp table:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        // Insert mapping data
        let insertMappingQueries = [];
        victims.forEach((victim, index) => {
          const newId = index + 1;
          insertMappingQueries.push([victim.VictimID, newId]);
        });
        
        if (insertMappingQueries.length === 0) {
          return res.json({ success: true, message: 'No victims to renumber' });
        }
        
        const insertMappingQuery = 'INSERT INTO victim_id_mapping (old_id, new_id) VALUES ?';
        
        db.query(insertMappingQuery, [insertMappingQueries], (err) => {
          if (err) {
            console.error('Error inserting mapping data:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
          }
          
          // Update Medical table references first
          const updateMedicalQuery = `
            UPDATE Medical m 
            JOIN victim_id_mapping vm ON m.VictimID = vm.old_id 
            SET m.VictimID = vm.new_id
          `;
          
          db.query(updateMedicalQuery, (err) => {
            if (err) {
              console.error('Error updating Medical table:', err);
              return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            // Update Victim table IDs
            const updateVictimQuery = `
              UPDATE Victim v 
              JOIN victim_id_mapping vm ON v.VictimID = vm.old_id 
              SET v.VictimID = vm.new_id
            `;
            
            db.query(updateVictimQuery, (err) => {
              if (err) {
                console.error('Error updating Victim table:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
              }
              
              // Reset auto increment
              const resetAutoIncrementQuery = `ALTER TABLE Victim AUTO_INCREMENT = ${victims.length + 1}`;
              
              db.query(resetAutoIncrementQuery, (err) => {
                if (err) {
                  console.error('Error resetting auto increment:', err);
                  return res.status(500).json({ error: 'Database error', details: err.message });
                }
                
                // Re-enable foreign key checks
                const enableFKQuery = 'SET FOREIGN_KEY_CHECKS = 1';
                
                db.query(enableFKQuery, (err) => {
                  if (err) {
                    console.error('Error enabling foreign key checks:', err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                  }
                  
                  console.log('VictimIDs renumbered successfully');
                  res.json({ 
                    success: true, 
                    message: `Successfully renumbered ${victims.length} victims from 1 to ${victims.length}` 
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});


module.exports = router;