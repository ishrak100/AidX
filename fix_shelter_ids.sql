-- SQL Script to ensure ShelterIDs are sequential from 1 to 15
-- Run this in MySQL Workbench to update your Shelter table

-- First, let's see the current state of the table
SELECT ShelterID, Name FROM Shelter ORDER BY ShelterID;

-- Create a temporary table with sequential IDs
CREATE TEMPORARY TABLE temp_shelter_mapping AS
SELECT 
    ShelterID as old_id,
    ROW_NUMBER() OVER (ORDER BY ShelterID) as new_id
FROM Shelter
ORDER BY ShelterID;

-- Disable foreign key checks temporarily (if there are any foreign key references)
SET FOREIGN_KEY_CHECKS = 0;

-- Update the ShelterIDs to be sequential
UPDATE Shelter s
JOIN temp_shelter_mapping tm ON s.ShelterID = tm.old_id
SET s.ShelterID = tm.new_id + 1000; -- Use temporary high numbers first

-- Now update them to the final sequential numbers
UPDATE Shelter 
SET ShelterID = ShelterID - 1000
WHERE ShelterID > 1000;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Reset AUTO_INCREMENT to continue from 16
ALTER TABLE Shelter AUTO_INCREMENT = 16;

-- Verify the result
SELECT ShelterID, Name FROM Shelter ORDER BY ShelterID;

-- Drop the temporary table
DROP TEMPORARY TABLE temp_shelter_mapping;
