const express = require('express');
const path = require('path');
const db = require('../config/db'); // Import MySQL connection
const router = express.Router();

// Serve the Medical HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'medical.html'));
});

// Fetch all medical data without filters
router.get('/api', (req, res) => {
  console.log('Medical API endpoint hit'); // Debug log
  
  // First, let's check if we need to fix VictimID relationships
  const checkMissingVictims = `
    SELECT DISTINCT m.VictimID 
    FROM Medical m 
    LEFT JOIN Victim v ON m.VictimID = v.VictimID 
    WHERE v.VictimID IS NULL
  `;
  
  db.query(checkMissingVictims, (err, missingVictims) => {
    if (err) {
      console.error('Error checking missing victims:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (missingVictims.length > 0) {
      console.log('Found missing VictimIDs, attempting to fix:', missingVictims.map(v => v.VictimID));
      
      // Get available VictimIDs from Victim table
      const getValidVictims = 'SELECT VictimID FROM Victim ORDER BY VictimID ASC';
      db.query(getValidVictims, (err, validVictims) => {
        if (err) {
          console.error('Error getting valid victims:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (validVictims.length === 0) {
          console.log('No valid victims found');
          return fetchMedicalData();
        }
        
        // Map each missing VictimID to a valid one
        let updatePromises = [];
        missingVictims.forEach((missing, index) => {
          const validVictimIndex = index % validVictims.length;
          const newVictimID = validVictims[validVictimIndex].VictimID;
          
          const updateQuery = 'UPDATE Medical SET VictimID = ? WHERE VictimID = ?';
          updatePromises.push(new Promise((resolve, reject) => {
            db.query(updateQuery, [newVictimID, missing.VictimID], (err, result) => {
              if (err) reject(err);
              else {
                console.log(`Updated VictimID ${missing.VictimID} to ${newVictimID}`);
                resolve(result);
              }
            });
          }));
        });
        
        Promise.all(updatePromises)
          .then(() => {
            console.log('All VictimID relationships fixed');
            fetchMedicalData();
          })
          .catch(err => {
            console.error('Error updating VictimIDs:', err);
            fetchMedicalData(); // Still try to fetch data
          });
      });
    } else {
      fetchMedicalData();
    }
  });

  function fetchMedicalData() {
    const query = `
      SELECT m.ReportID, 
             COALESCE(CONCAT(v.FirstName, ' ', v.LastName), 'Unknown Patient') AS PatientName,
             m.MedicalCondition, 
             m.Treatment,
             m.VictimID
      FROM Medical m
      LEFT JOIN Victim v ON m.VictimID = v.VictimID
      ORDER BY m.ReportID ASC;
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      console.log('Medical data fetched successfully:', results.length, 'rows'); // Debug log
      res.json(results);
    });
  }
});

// Search medical reports based on query
router.get('/api/search', (req, res) => {
  const { query } = req.query;
  console.log('Searching medical reports with query:', query); // Debug log

  let sqlQuery;
  let params = [];

  if (!query) {
    // If no search query, return all medical reports
    sqlQuery = `
      SELECT m.ReportID, 
             COALESCE(CONCAT(v.FirstName, ' ', v.LastName), 'Unknown Patient') AS PatientName,
             m.MedicalCondition, 
             m.Treatment,
             m.VictimID
      FROM Medical m
      LEFT JOIN Victim v ON m.VictimID = v.VictimID
      ORDER BY m.ReportID ASC;
    `;
  } else {
    // Search across multiple fields
    sqlQuery = `
      SELECT m.ReportID, 
             COALESCE(CONCAT(v.FirstName, ' ', v.LastName), 'Unknown Patient') AS PatientName,
             m.MedicalCondition, 
             m.Treatment,
             m.VictimID
      FROM Medical m
      LEFT JOIN Victim v ON m.VictimID = v.VictimID
      WHERE COALESCE(CONCAT(v.FirstName, ' ', v.LastName), 'Unknown Patient') LIKE ? 
         OR m.MedicalCondition LIKE ? 
         OR m.Treatment LIKE ?
      ORDER BY m.ReportID ASC;
    `;
    const searchTerm = `%${query}%`;
    params = [searchTerm, searchTerm, searchTerm];
  }

  db.query(sqlQuery, params, (err, results) => {
    if (err) {
      console.error('Database error during search:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    console.log('Search results:', results.length, 'medical reports found'); // Debug log
    res.json(results);
  });
});

// Statistics endpoint for medical data
router.get('/api/statistics', (req, res) => {
  console.log('Medical statistics API endpoint hit'); // Debug log
  
  // Query to get total medical reports count
  const totalReportsQuery = 'SELECT COUNT(*) as medicalCount FROM Medical';
  
  // Query to get unique patients count
  const uniquePatientsQuery = 'SELECT COUNT(DISTINCT VictimID) as patientCount FROM Medical';
  
  // Query to get most recent medical report
  const recentReportQuery = `
    SELECT COALESCE(CONCAT(v.FirstName, ' ', v.LastName), 'Unknown Patient') AS PatientName,
           m.MedicalCondition,
           m.Treatment
    FROM Medical m
    LEFT JOIN Victim v ON m.VictimID = v.VictimID
    ORDER BY m.ReportID DESC
    LIMIT 1
  `;

  // Execute all queries
  db.query(totalReportsQuery, (err1, totalResults) => {
    if (err1) {
      console.error('Error fetching total medical reports count:', err1);
      return res.status(500).json({ error: 'Error fetching medical statistics' });
    }

    db.query(uniquePatientsQuery, (err2, patientsResults) => {
      if (err2) {
        console.error('Error fetching unique patients count:', err2);
        return res.status(500).json({ error: 'Error fetching medical statistics' });
      }

      db.query(recentReportQuery, (err3, recentResults) => {
        if (err3) {
          console.error('Error fetching recent medical report:', err3);
          return res.status(500).json({ error: 'Error fetching medical statistics' });
        }

        const statistics = {
          medicalCount: totalResults[0]?.medicalCount || 0,
          patientCount: patientsResults[0]?.patientCount || 0,
          recentReport: recentResults[0] || null
        };

        console.log('Medical statistics fetched successfully:', statistics); // Debug log
        res.json(statistics);
      });
    });
  });
});

// Add a new medical report
router.post('/api', (req, res) => {
  const { PatientName, MedicalCondition, Treatment } = req.body;
  
  console.log('Adding new medical report:', req.body); // Debug log

  // Validate required fields
  if (!PatientName || !MedicalCondition || !Treatment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Split patient name into first and last name
  const nameParts = PatientName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // First, check if a victim with this name already exists
  const findVictimQuery = `
    SELECT VictimID FROM Victim 
    WHERE CONCAT(FirstName, ' ', LastName) = ? OR 
          (FirstName = ? AND LastName = ?)
  `;

  db.query(findVictimQuery, [PatientName, firstName, lastName], (err, victims) => {
    if (err) {
      console.error('Database error finding victim:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    let victimID;
    
    if (victims.length > 0) {
      // Use existing victim
      victimID = victims[0].VictimID;
      insertMedicalReport();
    } else {
      // Create new victim entry with unique contact number
      const uniqueContact = `${Date.now() % 100000000}`;
      const insertVictimQuery = `
        INSERT INTO Victim (FirstName, LastName, Age, Gender, ContactNumber, Address, Status, LocationID)
        VALUES (?, ?, 0, 'Other', ?, 'Unknown', 'Safe', 1)
      `;
      
      db.query(insertVictimQuery, [firstName, lastName, uniqueContact], (err, result) => {
        if (err) {
          console.error('Database error creating victim:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        victimID = result.insertId;
        insertMedicalReport();
      });
    }

    function insertMedicalReport() {
      const query = `
        INSERT INTO Medical (VictimID, MedicalCondition, Treatment)
        VALUES (?, ?, ?)
      `;

      db.query(query, [victimID, MedicalCondition, Treatment], (err, result) => {
        if (err) {
          console.error('Database error adding medical report:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        console.log('Medical report added successfully:', result.insertId);
        res.json({ 
          success: true, 
          message: 'Medical report added successfully',
          reportId: result.insertId 
        });
      });
    }
  });
});

// Update an existing medical report
router.put('/api/:id', (req, res) => {
  const reportId = req.params.id;
  const { PatientName, MedicalCondition, Treatment } = req.body;
  
  console.log('Updating medical report:', reportId, req.body); // Debug log

  // Validate required fields
  if (!PatientName || !MedicalCondition || !Treatment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Split patient name into first and last name
  const nameParts = PatientName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // First, check if a victim with this name already exists
  const findVictimQuery = `
    SELECT VictimID FROM Victim 
    WHERE CONCAT(FirstName, ' ', LastName) = ? OR 
          (FirstName = ? AND LastName = ?)
  `;

  db.query(findVictimQuery, [PatientName, firstName, lastName], (err, victims) => {
    if (err) {
      console.error('Database error finding victim:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    let victimID;
    
    if (victims.length > 0) {
      // Use existing victim
      victimID = victims[0].VictimID;
      updateMedicalReport();
    } else {
      // Create new victim entry with unique contact number
      const uniqueContact = `${Date.now() % 100000000}`;
      const insertVictimQuery = `
        INSERT INTO Victim (FirstName, LastName, Age, Gender, ContactNumber, Address, Status, LocationID)
        VALUES (?, ?, 0, 'Other', ?, 'Unknown', 'Safe', 1)
      `;
      
      db.query(insertVictimQuery, [firstName, lastName, uniqueContact], (err, result) => {
        if (err) {
          console.error('Database error creating victim:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        victimID = result.insertId;
        updateMedicalReport();
      });
    }

    function updateMedicalReport() {
      const query = `
        UPDATE Medical 
        SET VictimID = ?, MedicalCondition = ?, Treatment = ?
        WHERE ReportID = ?
      `;

      db.query(query, [victimID, MedicalCondition, Treatment, reportId], (err, result) => {
        if (err) {
          console.error('Database error updating medical report:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Medical report not found' });
        }
        
        console.log('Medical report updated successfully:', reportId);
        res.json({ 
          success: true, 
          message: 'Medical report updated successfully' 
        });
      });
    }
  });
});

// Delete a medical report
router.delete('/api/:id', (req, res) => {
  const reportId = req.params.id;
  
  console.log('Deleting medical report:', reportId); // Debug log

  const query = 'DELETE FROM Medical WHERE ReportID = ?';

  db.query(query, [reportId], (err, result) => {
    if (err) {
      console.error('Database error deleting medical report:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Medical report not found' });
    }
    
    console.log('Medical report deleted successfully:', reportId);
    res.json({ 
      success: true, 
      message: 'Medical report deleted successfully' 
    });
  });
});

// Get statistics
router.get('/api/stats', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as totalReports,
      COUNT(DISTINCT VictimID) as totalPatients
    FROM Medical
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error fetching stats:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    res.json(results[0]);
  });
});

// Renumber ReportIDs to start from 1
router.post('/api/renumber-ids', (req, res) => {
  console.log('Renumbering ReportIDs...');
  
  // First, get all medical reports ordered by current ReportID
  const selectQuery = `SELECT ReportID FROM Medical ORDER BY ReportID`;
  
  db.query(selectQuery, (err, reports) => {
    if (err) {
      console.error('Error fetching reports for renumbering:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (reports.length === 0) {
      return res.json({ success: true, message: 'No medical reports to renumber' });
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
        CREATE TEMPORARY TABLE medical_id_mapping (
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
        reports.forEach((report, index) => {
          const newId = index + 1;
          insertMappingQueries.push([report.ReportID, newId]);
        });
        
        const insertMappingQuery = 'INSERT INTO medical_id_mapping (old_id, new_id) VALUES ?';
        
        db.query(insertMappingQuery, [insertMappingQueries], (err) => {
          if (err) {
            console.error('Error inserting mapping data:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
          }
          
          // Update Medical table IDs
          const updateMedicalQuery = `
            UPDATE Medical m 
            JOIN medical_id_mapping mm ON m.ReportID = mm.old_id 
            SET m.ReportID = mm.new_id
          `;
          
          db.query(updateMedicalQuery, (err) => {
            if (err) {
              console.error('Error updating Medical table:', err);
              return res.status(500).json({ error: 'Database error', details: err.message });
            }
            
            // Reset auto increment
            const resetAutoIncrementQuery = `ALTER TABLE Medical AUTO_INCREMENT = ${reports.length + 1}`;
            
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
                
                console.log('ReportIDs renumbered successfully');
                res.json({ 
                  success: true, 
                  message: `Successfully renumbered ${reports.length} medical reports from 1 to ${reports.length}` 
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
