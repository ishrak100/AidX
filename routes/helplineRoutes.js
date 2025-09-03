const express = require('express');
const path = require('path');
const db = require('../config/db');
const router = express.Router();

// GET helpline page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/helpline.html'));
});

// API Routes

// Get all helplines
router.get('/api', (req, res) => {
    const query = `
        SELECT 
            h.HelpLineID,
            h.\`Local Administration\` as LocalAdministration,
            h.\`Central Administration\` as CentralAdministration,
            h.NGO,
            h.\`Fire Service\` as FireService,
            h.Ambulance,
            h.LocationID,
            CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location,
            l.Division,
            l.District,
            l.Area
        FROM HelpLine h
        LEFT JOIN Location l ON h.LocationID = l.LocationID
        ORDER BY h.HelpLineID
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching helplines:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(results);
    });
});

// Search helplines
router.get('/api/search', (req, res) => {
    const searchQuery = req.query.query;
    
    if (!searchQuery) {
        // If no search query, return all helplines
        const query = `
            SELECT 
                h.HelpLineID,
                h.\`Local Administration\` as LocalAdministration,
                h.\`Central Administration\` as CentralAdministration,
                h.NGO,
                h.\`Fire Service\` as FireService,
                h.Police,
                h.\`Armed Forces\` as ArmedForces,
                h.Ambulance,
                h.LocationID,
                CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location,
                l.Division,
                l.District,
                l.Area
            FROM HelpLine h
            LEFT JOIN Location l ON h.LocationID = l.LocationID
            ORDER BY h.HelpLineID
        `;
        
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching helplines:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json(results);
        });
        return;
    }

    const query = `
        SELECT 
            h.HelpLineID,
            h.\`Local Administration\` as LocalAdministration,
            h.\`Central Administration\` as CentralAdministration,
            h.NGO,
            h.\`Fire Service\` as FireService,
            h.Ambulance,
            h.LocationID,
            CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location,
            l.Division,
            l.District,
            l.Area
        FROM HelpLine h
        LEFT JOIN Location l ON h.LocationID = l.LocationID
        WHERE 
            h.\`Local Administration\` LIKE ? OR 
            h.\`Central Administration\` LIKE ? OR 
            h.NGO LIKE ? OR 
            h.\`Fire Service\` LIKE ? OR 
            h.Ambulance LIKE ? OR 
            l.Division LIKE ? OR 
            l.District LIKE ? OR 
            l.Area LIKE ?
        ORDER BY h.HelpLineID
    `;
    
    const searchPattern = `%${searchQuery}%`;
    const params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error searching helplines:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(results);
    });
});

// Get helpline statistics
router.get('/api/helpline-statistics', (req, res) => {
    const queries = {
        totalHelpLines: 'SELECT COUNT(*) as count FROM HelpLine',
        totalLocations: 'SELECT COUNT(DISTINCT LocationID) as count FROM HelpLine',
        recentHelpLine: `
            SELECT 
                h.\`Local Administration\` as LocalAdministration,
                h.NGO,
                h.LocationID,
                l.Division,
                l.District,
                l.Area
            FROM HelpLine h
            LEFT JOIN Location l ON h.LocationID = l.LocationID
            ORDER BY h.HelpLineID DESC 
            LIMIT 1
        `
    };

    // Execute all queries
    Promise.all([
        new Promise((resolve, reject) => {
            db.query(queries.totalHelpLines, (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(queries.totalLocations, (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(queries.recentHelpLine, (err, results) => {
                if (err) reject(err);
                else resolve(results[0] || null);
            });
        })
    ])
    .then(([totalHelpLines, totalLocations, recentHelpLine]) => {
        res.json({
            totalHelpLines,
            totalLocations,
            recentHelpLine
        });
    })
    .catch(err => {
        console.error('Error fetching helpline statistics:', err);
        res.status(500).json({ error: 'Database error' });
    });
});

// Get single helpline by ID
router.get('/api/:id', (req, res) => {
    const helplineId = req.params.id;
    
    const query = `
        SELECT 
            h.HelpLineID,
            h.\`Local Administration\` as LocalAdministration,
            h.\`Central Administration\` as CentralAdministration,
            h.NGO,
            h.\`Fire Service\` as FireService,
            h.Ambulance,
            h.LocationID,
            CONCAT(l.Division, ', ', l.District, ', ', l.Area) AS Location,
            l.Division,
            l.District,
            l.Area
        FROM HelpLine h
        LEFT JOIN Location l ON h.LocationID = l.LocationID
        WHERE h.HelpLineID = ?
    `;
    
    db.query(query, [helplineId], (err, results) => {
        if (err) {
            console.error('Error fetching helpline:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'HelpLine not found' });
        }
        
        res.json(results[0]);
    });
});

// Add new helpline
router.post('/api/addHelpLine', (req, res) => {
    const { LocalAdministration, CentralAdministration, NGO, FireService, Ambulance, Division, District, Area } = req.body;
    
    // Validate required fields
    if (!LocalAdministration || !CentralAdministration || !NGO || !FireService || !Ambulance || !Division || !District || !Area) {
        return res.status(400).json({ 
            error: 'All fields are required',
            message: 'Please fill in all required fields'
        });
    }
    
    // First, check if location exists, if not create it
    const locationQuery = `
        SELECT LocationID FROM Location 
        WHERE Division = ? AND District = ? AND Area = ?
    `;
    
    db.query(locationQuery, [Division, District, Area], (err, locationResults) => {
        if (err) {
            console.error('Error checking location:', err);
            return res.status(500).json({ 
                error: 'Database error',
                message: 'Failed to process location'
            });
        }
        
        let locationId;
        
        if (locationResults.length > 0) {
            // Location exists, use existing LocationID
            locationId = locationResults[0].LocationID;
            insertHelpLine(locationId);
        } else {
            // Location doesn't exist, create new location
            const insertLocationQuery = `
                INSERT INTO Location (Division, District, Area) 
                VALUES (?, ?, ?)
            `;
            
            db.query(insertLocationQuery, [Division, District, Area], (err, insertResult) => {
                if (err) {
                    console.error('Error inserting location:', err);
                    return res.status(500).json({ 
                        error: 'Database error',
                        message: 'Failed to create location'
                    });
                }
                
                locationId = insertResult.insertId;
                insertHelpLine(locationId);
            });
        }
        
        function insertHelpLine(locationId) {
            const query = `
                INSERT INTO HelpLine (\`Local Administration\`, \`Central Administration\`, NGO, \`Fire Service\`, Police, \`Armed Forces\`, Ambulance, LocationID) 
                VALUES (?, ?, ?, ?, '', '', ?, ?)
            `;
            
            const values = [LocalAdministration, CentralAdministration, NGO, FireService, Ambulance, locationId];
            
            db.query(query, values, (err, result) => {
                if (err) {
                    console.error('Error adding helpline:', err);
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ 
                            error: 'Duplicate entry',
                            message: 'This helpline entry already exists'
                        });
                    }
                    return res.status(500).json({ 
                        error: 'Database error',
                        message: 'Failed to add helpline'
                    });
                }
                
                res.status(201).json({ 
                    message: 'HelpLine added successfully',
                    helplineId: result.insertId
                });
            });
        }
    });
});

// Update helpline
router.put('/api/update/:id', (req, res) => {
    const helplineId = req.params.id;
    const { LocalAdministration, CentralAdministration, NGO, FireService, Ambulance, Division, District, Area } = req.body;
    
    // Validate required fields
    if (!LocalAdministration || !CentralAdministration || !NGO || !FireService || !Ambulance || !Division || !District || !Area) {
        return res.status(400).json({ 
            error: 'All fields are required',
            message: 'Please fill in all required fields'
        });
    }
    
    // First, check if location exists, if not create it
    const locationQuery = `
        SELECT LocationID FROM Location 
        WHERE Division = ? AND District = ? AND Area = ?
    `;
    
    db.query(locationQuery, [Division, District, Area], (err, locationResults) => {
        if (err) {
            console.error('Error checking location:', err);
            return res.status(500).json({ 
                error: 'Database error',
                message: 'Failed to process location'
            });
        }
        
        let locationId;
        
        if (locationResults.length > 0) {
            // Location exists, use existing LocationID
            locationId = locationResults[0].LocationID;
            updateHelpLine(locationId);
        } else {
            // Location doesn't exist, create new location
            const insertLocationQuery = `
                INSERT INTO Location (Division, District, Area) 
                VALUES (?, ?, ?)
            `;
            
            db.query(insertLocationQuery, [Division, District, Area], (err, insertResult) => {
                if (err) {
                    console.error('Error inserting location:', err);
                    return res.status(500).json({ 
                        error: 'Database error',
                        message: 'Failed to create location'
                    });
                }
                
                locationId = insertResult.insertId;
                updateHelpLine(locationId);
            });
        }
        
        function updateHelpLine(locationId) {
            const query = `
                UPDATE HelpLine 
                SET \`Local Administration\` = ?, \`Central Administration\` = ?, NGO = ?, \`Fire Service\` = ?, Police = '', \`Armed Forces\` = '', Ambulance = ?, LocationID = ?
                WHERE HelpLineID = ?
            `;
            
            const values = [LocalAdministration, CentralAdministration, NGO, FireService, Ambulance, locationId, helplineId];
            
            db.query(query, values, (err, result) => {
                if (err) {
                    console.error('Error updating helpline:', err);
                    return res.status(500).json({ 
                        error: 'Database error',
                        message: 'Failed to update helpline'
                    });
                }
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ 
                        error: 'HelpLine not found',
                        message: 'No helpline found with the specified ID'
                    });
                }
                
                res.json({ 
                    message: 'HelpLine updated successfully'
                });
            });
        }
    });
});

// Delete helpline
router.delete('/api/delete/:id', (req, res) => {
    const helplineId = req.params.id;
    
    const query = 'DELETE FROM HelpLine WHERE HelpLineID = ?';
    
    db.query(query, [helplineId], (err, result) => {
        if (err) {
            console.error('Error deleting helpline:', err);
            return res.status(500).json({ 
                error: 'Database error',
                message: 'Failed to delete helpline'
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                error: 'HelpLine not found',
                message: 'No helpline found with the specified ID'
            });
        }
        
        res.json({ 
            message: 'HelpLine deleted successfully'
        });
    });
});

module.exports = router;
