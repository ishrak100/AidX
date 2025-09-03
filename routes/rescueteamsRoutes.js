const express = require('express');
const path = require('path');
const db = require('../config/db'); // Import MySQL connection
const router = express.Router();
const moment = require('moment');


// Serve the Victims HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'rescueteams.html'));
});

// Fetch all rescue teams (limit 50 for efficiency)
router.get('/api', (req, res) => {
  const query = `
    SELECT rt.TeamID, 
           rt.TeamName, 
           rt.Specialization, 
           rt.ContactNumber, 
           CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS AssignedArea 
    FROM RescueTeam rt
    JOIN Location l ON rt.LocationID = l.LocationID
    LIMIT 50;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching rescue teams');
    }
    res.json(results);
  });
});

// Search for rescue teams based on name, specialization, or location
router.get('/api/search', (req, res) => {
  const searchQuery = req.query.query || '';
  const wildcardSearch = `%${searchQuery}%`;

  const query = `
    SELECT rt.TeamID, 
           rt.TeamName, 
           rt.Specialization, 
           rt.ContactNumber, 
           CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS AssignedArea 
    FROM RescueTeam rt
    JOIN Location l ON rt.LocationID = l.LocationID
    WHERE LOWER(rt.TeamName) LIKE LOWER(?)
       OR LOWER(rt.Specialization) LIKE LOWER(?)
       OR LOWER(CONCAT(l.Division, ', ', l.District, ', ', l.Area)) LIKE LOWER(?)
    LIMIT 50;
  `;

  db.query(query, [wildcardSearch, wildcardSearch, wildcardSearch], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error searching rescue teams');
    }
    res.json(results);
  });
});


// Add a new rescue team
router.post('/api/add', (req, res) => {
  if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
  }

  let { teamName, teamType, contactNumber, city, state, country } = req.body;

  // Map frontend fields to database fields
  const TeamName = teamName;
  const Specialization = teamType;
  const ContactNumber = contactNumber;
  const Division = city;
  const District = state;
  const Area = country;

  console.log(`Received data: ${TeamName}, ${Specialization}, ${ContactNumber}, ${Division}, ${District}, ${Area}`);

  if (!TeamName || !Specialization || !ContactNumber || !Division || !District || !Area) {
      return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if the location already exists
  const locationQuery = `SELECT LocationID FROM Location WHERE Division = ? AND District = ? AND Area = ?`;
  const locationValues = [Division, District, Area];

  db.query(locationQuery, locationValues, (err, locationResult) => {
      if (err) {
          console.error('Error checking location:', err);
          return res.status(500).json({ error: 'Failed to check location' });
      }

      if (locationResult.length > 0) {
          // Location exists, use the existing LocationID
          const locationID = locationResult[0].LocationID;
          insertRescueTeam(locationID);
      } else {
          // Insert new location
          const insertLocationQuery = `INSERT INTO Location (Division, District, Area) VALUES (?, ?, ?)`;

          db.query(insertLocationQuery, locationValues, (err, result) => {
              if (err) {
                  console.error('Error inserting location:', err);
                  return res.status(500).json({ error: 'Failed to insert location' });
              }

              const newLocationID = result.insertId;
              insertRescueTeam(newLocationID);
          });
      }
  });

  // Function to insert the rescue team using the obtained LocationID
  function insertRescueTeam(locationID) {
      const insertRescueQuery = `
          INSERT INTO RescueTeam (TeamName, Specialization, ContactNumber, LocationID)
          VALUES (?, ?, ?, ?)`;

      const rescueValues = [TeamName, Specialization, ContactNumber, locationID];

      db.query(insertRescueQuery, rescueValues, (err, result) => {
          if (err) {
              console.error('Error inserting rescue team:', err);
              return res.status(500).json({ error: 'Failed to insert rescue team data' });
          }
          res.json({ message: 'Rescue team added successfully', id: result.insertId });
      });
  }
});


// Statistics endpoint for rescue team data
router.get('/api/statistics', (req, res) => {
  console.log('Rescue team statistics API endpoint hit'); // Debug log
  
  // Query to get total rescue team count
  const totalTeamsQuery = 'SELECT COUNT(*) as teamCount FROM RescueTeam';
  
  // Query to get active rescue teams count (assuming teams with active operations are "active")
  const activeTeamsQuery = `
    SELECT COUNT(DISTINCT rt.TeamID) as activeTeamCount 
    FROM RescueTeam rt
    JOIN RescueOperation ro ON rt.TeamID = ro.TeamID
    WHERE ro.Status IN ('Active', 'In Progress', 'Ongoing')
  `;
  
  // Query to get most recent rescue team
  const recentTeamQuery = `
    SELECT rt.TeamName, rt.ContactNumber, rt.Specialization
    FROM RescueTeam rt
    ORDER BY rt.TeamID DESC
    LIMIT 1
  `;

  // Execute all queries
  db.query(totalTeamsQuery, (err1, totalResults) => {
    if (err1) {
      console.error('Error fetching total rescue teams count:', err1);
      return res.status(500).json({ error: 'Error fetching rescue team statistics' });
    }

    db.query(activeTeamsQuery, (err2, activeResults) => {
      if (err2) {
        console.error('Error fetching active rescue teams count:', err2);
        return res.status(500).json({ error: 'Error fetching rescue team statistics' });
      }

      db.query(recentTeamQuery, (err3, recentResults) => {
        if (err3) {
          console.error('Error fetching recent rescue team:', err3);
          return res.status(500).json({ error: 'Error fetching rescue team statistics' });
        }

        const statistics = {
          teamCount: totalResults[0]?.teamCount || 0,
          activeTeamCount: activeResults[0]?.activeTeamCount || 0,
          recentTeam: recentResults[0] || null
        };

        console.log('Rescue team statistics fetched successfully:', statistics); // Debug log
        res.json(statistics);
      });
    });
  });
});

router.get('/api/:id', (req, res) => {
  const teamId = req.params.id;

  const query = `
    SELECT r.TeamID, r.TeamName, r.Specialization, r.ContactNumber, 
           l.Division, l.District, l.Area 
    FROM RescueTeam r
    JOIN Location l ON r.LocationID = l.LocationID
    WHERE r.TeamID = ?;
  `;

  db.query(query, [teamId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching rescue team data' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Rescue Team not found' });
    }
    res.json(results[0]);
  });
});


router.put('/api/update/:id', (req, res) => {
  const teamId = req.params.id;
  const { TeamName, TeamType, ContactNumber, City, State, Country } = req.body;

  // Map frontend fields to database fields
  const Specialization = TeamType;
  const Division = City;
  const District = State;
  const Area = Country;

  if (!TeamName || !Specialization || !ContactNumber || !Division || !District || !Area) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Update Location Table First
  const updateLocationQuery = `
    UPDATE Location 
    SET Division = ?, District = ?, Area = ? 
    WHERE LocationID = (SELECT LocationID FROM RescueTeam WHERE TeamID = ?);
  `;

  db.query(updateLocationQuery, [Division, District, Area, teamId], (err, result) => {
    if (err) {
      console.error('Error updating location:', err);
      return res.status(500).json({ error: 'Failed to update location data' });
    }

    // Now update Rescue Team Table
    const updateRescueTeamQuery = `
      UPDATE RescueTeam 
      SET TeamName = ?, Specialization = ?, ContactNumber = ?
      WHERE TeamID = ?;
    `;

    db.query(updateRescueTeamQuery, [TeamName, Specialization, ContactNumber, teamId], (err, result) => {
      if (err) {
        console.error('Error updating rescue team:', err);
        return res.status(500).json({ error: 'Failed to update rescue team data' });
      }
      res.json({ message: 'Rescue Team updated successfully' });
    });
  });
});


router.delete('/api/delete/:id', (req, res) => {
  const teamId = req.params.id;

  // Delete the rescue team entry from the database
  const deleteRescueTeamQuery = 'DELETE FROM RescueTeam WHERE TeamID = ?';

  db.query(deleteRescueTeamQuery, [teamId], (err, result) => {
    if (err) {
      console.error('Error deleting rescue team:', err);
      return res.status(500).json({ error: 'Failed to delete rescue team' });
    }

    // Send response after successful deletion
    res.json({ message: 'Rescue team deleted successfully' });
  });
});


module.exports = router;