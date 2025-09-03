const express = require('express');
const path = require('path');
const db = require('../config/db'); // Import MySQL connection
const router = express.Router();
const moment = require('moment');

// Serve the Disasters HTML page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'donations.html'));
});


// Fetch all donations
router.get('/api', (req, res) => {
  const query = `
    SELECT 
      d.DonationID, 
      d.DonorName, 
      d.ResourceType, 
      CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Region, 
      d.Quantity, 
      d.Amount, 
      d.Date
    FROM Donation d
    JOIN Location l ON d.LocationID = l.LocationID
    LIMIT 50;`;

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching data from the database');
    }
    
    // Format dates for display
    const formattedResults = results.map(donation => ({
      ...donation,
      Date: moment(donation.Date).format('DD MMM, YYYY')
    }));
    
    res.json(formattedResults);  // Send the fetched data as JSON to the frontend
  });
});

// Search donations based on query
router.get('/api/search', (req, res) => {
  const searchQuery = req.query.query || '';  // Default empty string

  const query = `
    SELECT 
      d.DonationID, 
      d.DonorName, 
      d.ResourceType, 
      CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Region, 
      d.Quantity, 
      d.Amount, 
      d.Date
    FROM Donation d
    JOIN Location l ON d.LocationID = l.LocationID
    WHERE LOWER(d.DonorName) LIKE LOWER(?) 
       OR LOWER(d.ResourceType) LIKE LOWER(?)  
       OR LOWER(CONCAT(l.Division, ', ', l.District, ', ', l.Area)) LIKE LOWER(?)
       OR LOWER(d.Amount) LIKE LOWER(?)
    LIMIT 50;`;

  const wildcardSearch = `%${searchQuery}%`;
  const params = [wildcardSearch, wildcardSearch, wildcardSearch, wildcardSearch];

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching data from the database');
    }
    
    // Format dates for display
    const formattedResults = results.map(donation => ({
      ...donation,
      Date: moment(donation.Date).format('DD MMM, YYYY')
    }));
    
    res.json(formattedResults);  // Send data back to frontend
  });
});


router.post('/api/add', (req, res) => {
  if (!req.body) {
      return res.status(400).json({ error: 'Request body is missing' });
  }

  console.log("Request body received:", req.body);

  let { DonorName, ResourceType, City, State, Country, Quantity, Amount, Date: donationDate } = req.body;

  // Map frontend fields to database fields
  const Division = City;
  const District = State; 
  const Area = Country;

  // Handle optional fields and clean up input
  if (!ResourceType || ResourceType.trim() === "") ResourceType = null;
  if (!Quantity || Quantity.trim() === "") Quantity = null;
  if (!Amount || Amount.trim() === "") Amount = null;

  // Ensure that either Quantity or Amount is provided, but not both
  if (ResourceType && (Amount !== null && Quantity !== null)) {
      return res.status(400).json({
          error: 'Donation must either be money (with amount) or resources (with quantity), not both.'
      });
  }
  if (!ResourceType && (Quantity !== null && Amount !== null)) {
      return res.status(400).json({
          error: 'Donation must either be money (with amount) or resources (with quantity), not both.'
      });
  }

  console.log(`Parsed data: DonorName=${DonorName}, ResourceType=${ResourceType}, Division=${Division}, District=${District}, Area=${Area}, Quantity=${Quantity}, Amount=${Amount}, Date=${donationDate}`);

  // Ensure all required fields are provided
  if (!DonorName || !Division || !District || !Area || !donationDate || (Amount === null && Quantity === null)) {
      return res.status(400).json({ error: 'All required fields are missing or donation type is invalid' });
  }

  try {
      const formattedDate = new Date(donationDate).toISOString().split('T')[0];

      const locationQuery = `SELECT LocationID FROM Location WHERE Division = ? AND District = ? AND Area = ?`;
      const locationValues = [Division, District, Area];

      db.query(locationQuery, locationValues, (err, locationResult) => {
          if (err) {
              console.error('Error checking location:', err);
              return res.status(500).json({ error: 'Failed to check location' });
          }

          if (locationResult.length > 0) {
              const locationID = locationResult[0].LocationID;
              insertDonation(locationID);
          } else {
              const insertLocationQuery = `INSERT INTO Location (Division, District, Area) VALUES (?, ?, ?)`;

              db.query(insertLocationQuery, locationValues, (err, result) => {
                  if (err) {
                      console.error('Error inserting location:', err);
                      return res.status(500).json({ error: 'Failed to insert location' });
                  }

                  const newLocationID = result.insertId;
                  insertDonation(newLocationID);
              });
          }
      });

      function insertDonation(locationID) {
          const insertDonationQuery = `
              INSERT INTO Donation (DonorName, ResourceType, LocationID, Quantity, Amount, Date)
              VALUES (?, ?, ?, ?, ?, ?)`;

          const donationValues = [DonorName, ResourceType, locationID, Quantity, Amount, formattedDate];

          db.query(insertDonationQuery, donationValues, (err, result) => {
              if (err) {
                  console.error('Error inserting donation:', err);
                  return res.status(500).json({ error: 'Failed to insert donation data' });
              }
              res.json({ message: 'Donation added successfully', id: result.insertId });
          });
      }
  } catch (error) {
      console.error('Error processing date:', error);
      res.status(400).json({ error: 'Invalid date format' });
  }
});







// Statistics endpoint for donation data
router.get('/api/statistics', (req, res) => {
  console.log('Donation statistics API endpoint hit'); // Debug log
  
  // Query to get total donation count
  const totalDonationsQuery = 'SELECT COUNT(*) as donationCount FROM Donation';
  
  // Query to get total donation amount (sum of all monetary donations)
  const totalAmountQuery = 'SELECT COALESCE(SUM(Amount), 0) as totalAmount FROM Donation WHERE Amount IS NOT NULL';
  
  // Query to get most recent donation
  const recentDonationQuery = `
    SELECT DonorName, Amount, 
           CASE 
             WHEN ResourceType IS NOT NULL AND ResourceType != '' THEN ResourceType
             WHEN Amount IS NOT NULL THEN 'Money'
             ELSE 'Resource'
           END as DonationType
    FROM Donation
    ORDER BY DonationID DESC
    LIMIT 1
  `;

  // Execute all queries
  db.query(totalDonationsQuery, (err1, totalResults) => {
    if (err1) {
      console.error('Error fetching total donations count:', err1);
      return res.status(500).json({ error: 'Error fetching donation statistics' });
    }

    db.query(totalAmountQuery, (err2, amountResults) => {
      if (err2) {
        console.error('Error fetching total donation amount:', err2);
        return res.status(500).json({ error: 'Error fetching donation statistics' });
      }

      db.query(recentDonationQuery, (err3, recentResults) => {
        if (err3) {
          console.error('Error fetching recent donation:', err3);
          return res.status(500).json({ error: 'Error fetching donation statistics' });
        }

        const statistics = {
          donationCount: totalResults[0]?.donationCount || 0,
          totalAmount: amountResults[0]?.totalAmount || 0,
          recentDonation: recentResults[0] || null
        };

        console.log('Donation statistics fetched successfully:', statistics); // Debug log
        res.json(statistics);
      });
    });
  });
});

router.get('/api/:id', (req, res) => {
  const donationId = req.params.id;

  const query = `
    SELECT d.DonationID, d.DonorName, d.ResourceType, l.Division, l.District, l.Area, 
           d.Quantity, d.Amount, d.Date
    FROM Donation d
    JOIN Location l ON d.LocationID = l.LocationID
    WHERE d.DonationID = ?;
  `;

  db.query(query, [donationId], (err, results) => {
    if (err) {
      console.error('Error fetching donation data:', err);
      return res.status(500).json({ error: 'Error fetching donation data' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    // Format date for input field (YYYY-MM-DD)
    const donation = results[0];
    donation.Date = moment(donation.Date).format('YYYY-MM-DD');
    
    res.json(donation);
  });
});


router.put('/api/update/:id', (req, res) => {
  const donationId = req.params.id;
  const { DonorName, ResourceType, City, State, Country, Quantity, Amount, Date: donationDate } = req.body;

  // Map frontend fields to database fields
  const Division = City;
  const District = State; 
  const Area = Country;

  // Ensure that all required fields are provided
  if (!DonorName || !Division || !District || !Area || !donationDate) {
    return res.status(400).json({ error: 'All required fields are missing' });
  }

  const formattedDate = new Date(donationDate).toISOString().split('T')[0];

  // If Quantity or Amount is an empty string or undefined, set it to NULL
  const validQuantity = (Quantity === '' || Quantity === undefined) ? null : Quantity;
  const validAmount = (Amount === '' || Amount === undefined) ? null : Amount;

  // Check for mutual exclusivity of Amount and Quantity
  if ((validAmount !== null && validQuantity !== null) || (validAmount === null && validQuantity === null)) {
    return res.status(400).json({
      error: 'Donation must either be money (with amount) or resources (with quantity), not both or neither.'
    });
  }

  // First, update the Location Table for Division, District, and Area
  const updateLocationQuery = `
    UPDATE Location 
    SET Division = ?, District = ?, Area = ?
    WHERE LocationID = (SELECT LocationID FROM Donation WHERE DonationID = ?);
  `;

  db.query(updateLocationQuery, [Division, District, Area, donationId], (err, result) => {
    if (err) {
      console.error('Error updating location:', err);
      return res.status(500).json({ error: 'Failed to update location data' });
    }

    // Now update the Donation Table for DonorName, ResourceType, Quantity, Amount, and Date
    const updateDonationQuery = `
      UPDATE Donation 
      SET DonorName = ?, ResourceType = ?, Quantity = ?, Amount = ?, Date = ?
      WHERE DonationID = ?;
    `;

    db.query(updateDonationQuery, [DonorName, ResourceType, validQuantity, validAmount, formattedDate, donationId], (err, result) => {
      if (err) {
        console.error('Error updating donation:', err);
        return res.status(500).json({ error: 'Failed to update donation data' });
      }
      res.json({ message: 'Donation updated successfully' });
    });
  });
});



// Delete donation
router.delete('/api/delete/:id', (req, res) => {
  const donationId = req.params.id;

  console.log('Deleting donation with ID:', donationId);

  // Ensure donationId is a valid number (Integer)
  if (isNaN(donationId)) {
    return res.status(400).json({ error: 'Invalid donation ID' });
  }

  const deleteDonationQuery = 'DELETE FROM Donation WHERE DonationID = ?';

  // Execute the deletion query
  db.query(deleteDonationQuery, [donationId], (err, result) => {
    if (err) {
      console.error('Error deleting donation:', err);
      return res.status(500).json({ error: 'Failed to delete donation' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json({ message: 'Donation deleted successfully' });
  });
});

module.exports = router;