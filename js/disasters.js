 // Fetch data when the page is loaded
 document.addEventListener('DOMContentLoaded', function() {
  fetchData(); // Automatically fetch all the disaster data
});


// Function to fetch all disaster data from the backend
function fetchData() {
  const url = '/disasters/api';  // Fetch all disasters from the backend

  fetch(url)
    .then(response => response.json())
    .then(data => {
      populateTable(data);  // Populate the table with all disaster data
    })
    .catch(error => console.error('Error fetching data:', error));
}

// Function to populate the table with fetched data
function populateTable(data) {
  const tableBody = document.querySelector('#disastersTable tbody');
  tableBody.innerHTML = '';  // Clear the table before appending new data

  if (Array.isArray(data) && data.length > 0) {
    data.forEach(disaster => {
      const row = document.createElement('tr');
      row.setAttribute('data-id', disaster.id);  // Store the disaster ID in the row (hidden for backend)

      row.innerHTML = `
        <td>${disaster.DisasterID}</td>
        <td>${disaster.DisasterType}</td>
        <td>${disaster.Location}</td>
        <td>${disaster.DateOccurred}</td>
        <td>${disaster.SeverityLevel}</td>
        <td>${disaster.Description}</td>
        <td>
          <button class="editButton" onclick="editDisaster(${disaster.DisasterID})">Edit</button>
          <button class="deleteButton" onclick="deleteDisaster(${disaster.DisasterID})">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } else {
    tableBody.innerHTML = '<tr><td colspan="6">No data found</td></tr>';
  }
}


document.getElementById('fetchData').addEventListener('click', fetchFilterData);

function fetchFilterData() {
  let searchQuery = document.getElementById('searchInput').value.trim(); // Trim spaces

  searchQuery = searchQuery ? encodeURIComponent(searchQuery) : '';

  const url = `/disasters/api/search?query=${searchQuery}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      populateTable(data); // Update the table with new data
    })
    .catch(error => console.error('Error fetching data:', error));
}


// Function to fetch and update statistics
function fetchAndUpdateStatistics() {
  fetch('/disasters/api/statistics')
    .then(response => response.json())
    .then(data => {
      // Update the statistics section with fetched data
      document.getElementById('disasterCount').textContent = data.disasterCount;
      document.getElementById('affectedAreaCount').textContent = data.affectedAreaCount;
      
      // Extract recent disaster details
      if (data.recentDisaster && typeof data.recentDisaster === 'object') {
        document.getElementById('disasterName').textContent = data.recentDisaster.DisasterType || 'N/A';
        document.getElementById('disasterDate').textContent = data.recentDisaster.DateOccurred || 'N/A';
        document.getElementById('disasterLocation').textContent = data.recentDisaster.Location || 'N/A';
      } else {
        document.getElementById('disasterName').textContent = 'N/A';
        document.getElementById('disasterDate').textContent = 'N/A';
        document.getElementById('disasterLocation').textContent = 'N/A';
      }
    })
    .catch(error => console.error('Error fetching statistics:', error));
}

// Call the function on page load
document.addEventListener('DOMContentLoaded', fetchAndUpdateStatistics);



// Open Modal
document.getElementById('addDisaster').addEventListener('click', function () {
  document.getElementById('addDisasterModal').style.display = 'block';
});

// Close Modal
document.getElementById('closeModal').addEventListener('click', function () {
  document.getElementById('addDisasterModal').style.display = 'none';
});

// Handle Form Submission
document.getElementById('addDisasterForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const formData = new FormData(this);
  let data = Object.fromEntries(formData);

  console.log("Data sent:", data);

  // Ensure DateOccurred is formatted as YYYY-MM-DD
  if (data.DateOccurred) {
      data.DateOccurred = new Date(data.DateOccurred).toISOString().split('T')[0];
  }

  fetch('/disasters/api/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
  })
  .then(response => response.json())
  .then(result => {
      alert(result.message);
      document.getElementById('addDisasterModal').style.display = 'none';
      fetchData(); // Refresh the table
  })
  .catch(error => console.error('Error adding disaster:', error));
});


// Close Edit Modal
document.getElementById('closeEditModal').addEventListener('click', function () {
  document.getElementById('editDisasterModal').style.display = 'none';
});

// Function to edit a disaster
function editDisaster(disasterId) {
  fetch(`/disasters/api/${disasterId}`)
    .then(response => response.json())
    .then(data => {
      if (!data) {
        alert("Disaster not found!");
        return;
      }

      // Fill the form with existing details
      document.getElementById('editDisasterID').value = data.DisasterID;
      document.getElementById('editDisasterType').value = data.DisasterType;
      document.getElementById('editCity').value = data.City;
      document.getElementById('editState').value = data.State;
      document.getElementById('editCountry').value = data.Country;
      document.getElementById('editDateOccurred').value = data.DateOccurred;
      document.getElementById('editSeverityLevel').value = data.SeverityLevel;
      document.getElementById('editDescription').value = data.Description;

      // Show the edit modal
      document.getElementById('editDisasterModal').style.display = 'block';
    })
    .catch(error => console.error('Error fetching disaster details:', error));
}

// Handle Edit Form Submission
document.getElementById('editDisasterForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const disasterId = document.getElementById('editDisasterID').value;
  const updatedData = {
    DisasterType: document.getElementById('editDisasterType').value,
    City: document.getElementById('editCity').value,
    State: document.getElementById('editState').value,
    Country: document.getElementById('editCountry').value,
    DateOccurred: document.getElementById('editDateOccurred').value,
    SeverityLevel: document.getElementById('editSeverityLevel').value,
    Description: document.getElementById('editDescription').value
  };

  fetch(`/disasters/api/update/${disasterId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);
    document.getElementById('editDisasterModal').style.display = 'none';
    fetchData(); // Refresh the table
  })
  .catch(error => console.error('Error updating disaster:', error));
});


// Function to delete a disaster
function deleteDisaster(disasterId) {
  if (!confirm("Are you sure you want to delete this disaster?")) {
    return;
  }

  fetch(`/disasters/api/delete/${disasterId}`, {
    method: 'DELETE'
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);
    fetchData(); // Refresh the table
  })
  .catch(error => console.error('Error deleting disaster:', error));
}


