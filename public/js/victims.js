// Fetch victim data when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - initializing victim page'); // Debug log
    fetchVictimData(); // Automatically fetch all the victim data
    
    // Add a small delay to ensure DOM elements are ready
    setTimeout(() => {
      fetchAndUpdateVictimStatistics(); // Fetch statistics
    }, 100);
  });
  
  // Function to fetch all victim data from the backend
  function fetchVictimData() {
    console.log('Fetching victim data...'); // Debug log
    const url = '/victims/api';  // Fetch all victims from the backend
  
    fetch(url)
      .then(response => {
        console.log('Victims response status:', response.status); // Debug log
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Victim data received:', data); // Debug log
        populateVictimTable(data);  // Populate the table with all victim data
      })
      .catch(error => {
        console.error('Error fetching victim data:', error);
        // Show error message to user
        const tableBody = document.querySelector('#victimsTable tbody');
        tableBody.innerHTML = '<tr><td colspan="10">Error loading data. Check console for details.</td></tr>';
      });
  }
  
  // Function to populate the victim table with fetched data
  function populateVictimTable(data) {
    console.log('Populating victim table with data:', data); // Debug log
    const tableBody = document.querySelector('#victimsTable tbody');
    tableBody.innerHTML = '';  // Clear the table before appending new data
  
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(victim => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', victim.VictimID);  // Store the victim ID in the row
  
        row.innerHTML = `
          <td>${victim.VictimID}</td>
          <td>${victim.FirstName}</td>
          <td>${victim.LastName}</td>
          <td>${victim.Age}</td>
          <td>${victim.Gender}</td>
          <td>${victim.ContactNumber}</td>
          <td>${victim.Address}</td>
          <td>${victim.Status}</td>
          <td>${victim.Location}</td>
          <td>
            <button class="editButton" onclick="editVictim(${victim.VictimID})">Edit</button>
            <button class="deleteButton" onclick="deleteVictim(${victim.VictimID})">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
      console.log('Victim table populated successfully with', data.length, 'rows'); // Debug log
    } else {
      tableBody.innerHTML = '<tr><td colspan="10">No victim data found</td></tr>';
      console.log('No victim data to display'); // Debug log
    }
  }
  
// Event listener for the search button
// Add Enter key functionality to search input
document.getElementById('searchInput').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    fetchFilterData();
  }
});

// Add input event listener for real-time search
document.getElementById('searchInput').addEventListener('input', fetchFilterData);

function fetchFilterData() {
  let searchQuery = document.getElementById('searchInput').value.trim(); // Trim spaces

  searchQuery = searchQuery ? encodeURIComponent(searchQuery) : '';

  const url = `/victims/api/search?query=${searchQuery}`;  // Adjusted for victim search

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      populateVictimTable(data);  // Update the table with new data
    })
    .catch(error => console.error('Error fetching data:', error));
}


// Open Modal
document.getElementById('addVictim').addEventListener('click', function () {
  document.getElementById('addVictimModal').style.display = 'block';
});

// Close Modal
document.getElementById('closeModal').addEventListener('click', function () {
  document.getElementById('addVictimModal').style.display = 'none';
});

// Handle Form Submission
document.getElementById('addVictimForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const formData = new FormData(this);
  let data = Object.fromEntries(formData);

  console.log("Data sent:", data);

  fetch('/victims/api/addVictim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.error || 'Server error');
      });
    }
    return response.json();
  })
  .then(result => {
    alert(result.message);
    document.getElementById('addVictimModal').style.display = 'none';
    fetchVictimData(); // Refresh the victim data
    fetchAndUpdateVictimStatistics(); // Refresh statistics
    // Reset the form
    document.getElementById('addVictimForm').reset();
  })
  .catch(error => {
    console.error('Error adding victim:', error);
    alert('Error: ' + error.message);
  });
});



// Close Edit Modal
document.getElementById('closeEditModal').addEventListener('click', function () {
  document.getElementById('editVictimModal').style.display = 'none';
});


// Function to edit a victim
function editVictim(victimId) {
  fetch(`/victims/api/${victimId}`)
    .then(response => response.json())
    .then(data => {
      if (!data) {
        alert("Victim not found!");
        return;
      }

      // Fill the form with existing details
      document.getElementById('editVictimID').value = data.VictimID;
      document.getElementById('editFirstName').value = data.FirstName;
      document.getElementById('editLastName').value = data.LastName;
      document.getElementById('editAge').value = data.Age;
      document.getElementById('editGender').value = data.Gender;
      document.getElementById('editContactNumber').value = data.ContactNumber;
      document.getElementById('editAddress').value = data.Address;
      document.getElementById('editStatus').value = data.Status;
      document.getElementById('editDivision').value = data.Division;
      document.getElementById('editDistrict').value = data.District;
      document.getElementById('editArea').value = data.Area;

      // Show the edit modal
      document.getElementById('editVictimModal').style.display = 'block';
    })
    .catch(error => console.error('Error fetching victim details:', error));
}

// Handle Edit Form Submission
document.getElementById('editVictimForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const victimId = document.getElementById('editVictimID').value;
  const updatedData = {
    FirstName: document.getElementById('editFirstName').value,
    LastName: document.getElementById('editLastName').value,
    Age: document.getElementById('editAge').value,
    Gender: document.getElementById('editGender').value,
    ContactNumber: document.getElementById('editContactNumber').value,
    Address: document.getElementById('editAddress').value,
    Status: document.getElementById('editStatus').value,
    Division: document.getElementById('editDivision').value,
    District: document.getElementById('editDistrict').value,
    Area: document.getElementById('editArea').value
  };

  fetch(`/victims/api/update/${victimId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);
    document.getElementById('editVictimModal').style.display = 'none';
    fetchVictimData(); // Refresh the table
    fetchAndUpdateVictimStatistics(); // Refresh statistics
  })
  .catch(error => console.error('Error updating victim:', error));
});


// Function to delete a victim
function deleteVictim(victimId) {
  if (!confirm("Are you sure you want to delete this victim?")) {
    return;
  }

  fetch(`/victims/api/delete/${victimId}`, {
    method: 'DELETE'
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);
    fetchVictimData(); // Refresh the table
    fetchAndUpdateVictimStatistics(); // Refresh statistics
  })
  .catch(error => console.error('Error deleting victim:', error));
}

// Function to fetch and update victim statistics
function fetchAndUpdateVictimStatistics() {
  console.log('Starting to fetch victim statistics...'); // Debug log
  fetch('/victims/api/statistics')
    .then(response => {
      console.log('Statistics response status:', response.status); // Debug log
      return response.json();
    })
    .then(data => {
      console.log('Statistics data received:', data); // Debug log
      
      // Check if DOM elements exist
      const victimCountEl = document.getElementById('victimCount');
      const rescuedCountEl = document.getElementById('rescuedCount');
      const victimNameEl = document.getElementById('victimName');
      const victimStatusEl = document.getElementById('victimStatus');
      const victimLocationEl = document.getElementById('victimLocation');
      
      console.log('DOM elements found:', {
        victimCount: !!victimCountEl,
        rescuedCount: !!rescuedCountEl,
        victimName: !!victimNameEl,
        victimStatus: !!victimStatusEl,
        victimLocation: !!victimLocationEl
      });
      
      // Update the statistics section with fetched data
      if (victimCountEl) victimCountEl.textContent = data.victimCount || 0;
      if (rescuedCountEl) rescuedCountEl.textContent = data.rescuedCount || 0;
      
      // Extract recent victim details
      if (data.recentVictim && typeof data.recentVictim === 'object') {
        console.log('Recent victim data:', data.recentVictim); // Debug log
        const fullName = `${data.recentVictim.FirstName || ''} ${data.recentVictim.LastName || ''}`.trim();
        console.log('Constructed full name:', fullName); // Debug log
        
        if (victimNameEl) {
          victimNameEl.textContent = fullName || 'N/A';
          console.log('Set victim name to:', victimNameEl.textContent); // Debug log
        }
        if (victimStatusEl) {
          victimStatusEl.textContent = data.recentVictim.Status || 'N/A';
          console.log('Set victim status to:', victimStatusEl.textContent); // Debug log
        }
        if (victimLocationEl) {
          victimLocationEl.textContent = data.recentVictim.Location || 'N/A';
          console.log('Set victim location to:', victimLocationEl.textContent); // Debug log
        }
      } else {
        console.log('No recent victim data found or invalid format'); // Debug log
        if (victimNameEl) victimNameEl.textContent = 'N/A';
        if (victimStatusEl) victimStatusEl.textContent = 'N/A';
        if (victimLocationEl) victimLocationEl.textContent = 'N/A';
      }
      
      console.log('Statistics update completed'); // Debug log
    })
    .catch(error => {
      console.error('Error fetching victim statistics:', error);
      // Set default values in case of error
      const victimCountEl = document.getElementById('victimCount');
      const rescuedCountEl = document.getElementById('rescuedCount');
      const victimNameEl = document.getElementById('victimName');
      const victimStatusEl = document.getElementById('victimStatus');
      const victimLocationEl = document.getElementById('victimLocation');
      
      if (victimCountEl) victimCountEl.textContent = '0';
      if (rescuedCountEl) rescuedCountEl.textContent = '0';
      if (victimNameEl) victimNameEl.textContent = 'N/A';
      if (victimStatusEl) victimStatusEl.textContent = 'N/A';
      if (victimLocationEl) victimLocationEl.textContent = 'N/A';
    });
}
