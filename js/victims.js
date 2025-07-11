// Fetch victim data when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetchVictimData(); // Automatically fetch all the victim data
  });
  
  // Function to fetch all victim data from the backend
  function fetchVictimData() {
    const url = '/victims/api';  // Fetch all victims from the backend
  
    fetch(url)
      .then(response => response.json())
      .then(data => {
        populateVictimTable(data);  // Populate the table with all victim data
      })
      .catch(error => console.error('Error fetching victim data:', error));
  }
  
  // Function to populate the victim table with fetched data
  function populateVictimTable(data) {
    const tableBody = document.querySelector('#victimsTable tbody');
    tableBody.innerHTML = '';  // Clear the table before appending new data
  
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(victim => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', victim.VictimID);  // Store the victim ID in the row (hidden for backend)
  
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
    } else {
      tableBody.innerHTML = '<tr><td colspan="10">No data found</td></tr>';
    }
  }
  
// Event listener for the search button
document.getElementById('fetchData').addEventListener('click', fetchFilterData);

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
  .then(response => response.json())
  .then(result => {
    alert(result.message);
    document.getElementById('addVictimModal').style.display = 'none';
    fetchVictimData(); // Optionally refresh the victim data
  })
  .catch(error => console.error('Error adding victim:', error));
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
      document.getElementById('editCity').value = data.City;
      document.getElementById('editState').value = data.State;
      document.getElementById('editCountry').value = data.Country;

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
    City: document.getElementById('editCity').value,
    State: document.getElementById('editState').value,
    Country: document.getElementById('editCountry').value
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
  })
  .catch(error => console.error('Error deleting victim:', error));
}
