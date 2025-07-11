document.addEventListener('DOMContentLoaded', function () {
  fetchRescueOperations();
});

// Function to fetch all rescue operations
function fetchRescueOperations() {
  const url = 'rescueoperations/api';

  fetch(url)
    .then(response => response.json())
    .then(data => {
      populateRescueTable(data);
    })
    .catch(error => console.error('Error fetching rescue operations:', error));
}

// Function to populate the rescue operations table
function populateRescueTable(data) {
  const tableBody = document.querySelector('#rescueOperationsTable tbody');
  tableBody.innerHTML = ''; // Clear existing rows

  if (Array.isArray(data) && data.length > 0) {
    data.forEach(operation => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${operation.OperationID}</td>
        <td>${operation.DisasterName}</td>
        <td>${operation.TeamName}</td>
        <td>${operation.AffectedArea}</td>
        <td>${operation.StartDate}</td>
        <td>${operation.EndDate || 'N/A'}</td>
        <td>${operation.Status}</td>
        <td>
          <button class="editButton" onclick="editOperation(${operation.OperationID})">Edit</button>
          <button class="deleteButton" onclick="deleteOperation(${operation.OperationID})">Delete</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } else {
    tableBody.innerHTML = '<tr><td colspan="8">No rescue operations found</td></tr>';
  }
}


document.getElementById('fetchRescueOperationsData').addEventListener('click', fetchFilteredRescueOperations);

function fetchFilteredRescueOperations() {
  let searchQuery = document.getElementById('searchRescueOperations').value.trim();
  searchQuery = searchQuery ? encodeURIComponent(searchQuery) : '';

  const url = `/rescueoperations/api/search?query=${searchQuery}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      populateRescueTable(data);
    })
    .catch(error => console.error('Error fetching search results:', error));
}




// Open Modal
document.getElementById('addRescueOperation').addEventListener('click', function () {
  document.getElementById('addRescueOperationModal').style.display = 'block';
});

// Close Modal
document.getElementById('closeModal').addEventListener('click', function () {
  document.getElementById('addRescueOperationModal').style.display = 'none';
});


// Handle Form Submission for Adding Rescue Operation
document.getElementById('addRescueOperationForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const formData = new FormData(this);
  let data = Object.fromEntries(formData);

  console.log("Data sent for rescue operation:", data);

  // Ensure StartDate and EndDate are formatted as YYYY-MM-DD
  if (data.StartDate) {
      data.StartDate = new Date(data.StartDate).toISOString().split('T')[0];
  }
  if (data.EndDate) {
      data.EndDate = new Date(data.EndDate).toISOString().split('T')[0];
  }

  fetch('/rescueoperations/api/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
  })
  .then(response => response.json())
  .then(result => {
      alert(result.message);
      document.getElementById('addRescueOperationModal').style.display = 'none';
      fetchRescueOperations(); // Refresh the list of rescue operations
  })
  .catch(error => console.error('Error adding rescue operation:', error));
});



// Close Edit Modal
document.getElementById('closeEditModal').addEventListener('click', function () {
  document.getElementById('editRescueOperationModal').style.display = 'none';
});

// Function to edit a rescue operation
function editOperation(rescueOperationId) {
  fetch(`/rescueoperations/api/${rescueOperationId}`)
    .then(response => response.json())
    .then(data => {
      if (!data) {
        alert("Rescue operation not found!");
        return;
      }

      
      // Fill the form with existing details
      document.getElementById('editRescueOperationID').value = data.OperationID;
      document.getElementById('editDisasterName').value = data.DisasterName;
      document.getElementById('editTeamName').value = data.TeamName;
      document.getElementById('editTeamType').value = data.TeamType;
      document.getElementById('editContactNumber').value = data.ContactNumber;
      document.getElementById('editStartDate').value = data.StartDate;
      document.getElementById('editEndDate').value = data.EndDate;
      document.getElementById('editStatus').value = data.Status;
      document.getElementById('editCity').value = data.City;
      document.getElementById('editState').value = data.State;
      document.getElementById('editCountry').value = data.Country;
      document.getElementById('editSeverityLevel').value = data.SeverityLevel;


      // Show the edit modal
      document.getElementById('editRescueOperationModal').style.display = 'block';
    })
    .catch(error => console.error('Error fetching rescue operation details:', error));
}

// Handle Edit Form Submission
document.getElementById('editRescueOperationForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const rescueOperationId = document.getElementById('editRescueOperationID').value;
  const updatedData = {
    DisasterName: document.getElementById('editDisasterName').value,
    TeamName: document.getElementById('editTeamName').value,
    TeamType: document.getElementById('editTeamType').value,
    ContactNumber: document.getElementById('editContactNumber').value,
    StartDate: document.getElementById('editStartDate').value,
    EndDate: document.getElementById('editEndDate').value,
    Status: document.getElementById('editStatus').value,
    City: document.getElementById('editCity').value,
    State: document.getElementById('editState').value,
    Country: document.getElementById('editCountry').value,
    SeverityLevel: document.getElementById('editSeverityLevel').value,
    //Description: document.getElementById('editDescription').value
  };

  fetch(`/rescueoperations/api/update/${rescueOperationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);
    document.getElementById('editRescueOperationModal').style.display = 'none';
    fetchRescueOperations() // Refresh the table
  })
  .catch(error => console.error('Error updating rescue operation:', error));
});


// Function to delete a rescue operation
function deleteOperation(rescueOperationId) {
  if (!confirm("Are you sure you want to delete this rescue operation?")) {
    return;
  }

  fetch(`/rescueoperations/api/delete/${rescueOperationId}`, {
    method: 'DELETE',
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);
    fetchRescueOperations();// Refresh the table
  })
  .catch(error => console.error('Error deleting rescue operation:', error));
}
