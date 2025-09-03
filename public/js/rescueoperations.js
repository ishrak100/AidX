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

// Function to format date for display
function formatDateForDisplay(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    // Format as DD/MM/YYYY or MM/DD/YYYY based on preference
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original if formatting fails
  }
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
        <td>${formatDateForDisplay(operation.StartDate)}</td>
        <td>${formatDateForDisplay(operation.EndDate)}</td>
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


// Add Enter key functionality to search input
document.getElementById('searchRescueOperations').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    fetchFilteredRescueOperations();
  }
});

// Add input event listener for real-time search
document.getElementById('searchRescueOperations').addEventListener('input', fetchFilteredRescueOperations);

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
  document.getElementById('addRescueOperationModal').style.display = 'flex';
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

  console.log("Formatted data being sent:", data);

  fetch('/rescueoperations/api/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
  })
  .then(response => {
    console.log('Response status:', response.status);
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.error || 'Server error');
      });
    }
    return response.json();
  })
  .then(result => {
      console.log('Success response:', result);
      alert(result.message);
      document.getElementById('addRescueOperationModal').style.display = 'none';
      fetchRescueOperations(); // Refresh the list of rescue operations
      // Reset the form
      document.getElementById('addRescueOperationForm').reset();
  })
  .catch(error => {
      console.error('Error adding rescue operation:', error);
      alert('Error: ' + error.message);
  });
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

      console.log('Edit data received:', data); // Debug log to see the data format

      // Fill the form with existing details
      document.getElementById('editRescueOperationID').value = data.OperationID;
      document.getElementById('editDisasterName').value = data.DisasterName || '';
      document.getElementById('editTeamName').value = data.TeamName || '';
      
      // Format dates for HTML date inputs (YYYY-MM-DD format)
      if (data.StartDate) {
        const startDate = new Date(data.StartDate);
        document.getElementById('editStartDate').value = startDate.toISOString().split('T')[0];
      }
      
      if (data.EndDate) {
        const endDate = new Date(data.EndDate);
        document.getElementById('editEndDate').value = endDate.toISOString().split('T')[0];
      }
      
      document.getElementById('editStatus').value = data.Status || '';
      document.getElementById('editDivision').value = data.Division || '';
      document.getElementById('editDistrict').value = data.District || '';
      document.getElementById('editArea').value = data.Area || '';

      // Show the edit modal
      document.getElementById('editRescueOperationModal').style.display = 'flex';
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
    StartDate: document.getElementById('editStartDate').value,
    EndDate: document.getElementById('editEndDate').value,
    Status: document.getElementById('editStatus').value,
    Division: document.getElementById('editDivision').value,
    District: document.getElementById('editDistrict').value,
    Area: document.getElementById('editArea').value
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

// Function to fetch and update rescue operation statistics
function fetchAndUpdateRescueOperationStatistics() {
  fetch('/rescueoperations/api/statistics')
    .then(response => response.json())
    .then(data => {
      // Update the statistics section with fetched data
      document.getElementById('operationCount').textContent = data.operationCount || 0;
      document.getElementById('activeOperationCount').textContent = data.activeOperationCount || 0;
      
      // Extract recent rescue operation details
      if (data.recentOperation && typeof data.recentOperation === 'object') {
        document.getElementById('operationType').textContent = data.recentOperation.DisasterName || 'N/A';
        document.getElementById('operationStatus').textContent = data.recentOperation.Status || 'N/A';
        document.getElementById('operationLocation').textContent = data.recentOperation.AffectedArea || 'N/A';
      } else {
        document.getElementById('operationType').textContent = 'N/A';
        document.getElementById('operationStatus').textContent = 'N/A';
        document.getElementById('operationLocation').textContent = 'N/A';
      }
    })
    .catch(error => {
      console.error('Error fetching rescue operation statistics:', error);
      // Set default values in case of error
      document.getElementById('operationCount').textContent = '0';
      document.getElementById('activeOperationCount').textContent = '0';
      document.getElementById('operationType').textContent = 'N/A';
      document.getElementById('operationStatus').textContent = 'N/A';
      document.getElementById('operationLocation').textContent = 'N/A';
    });
}

// Call the statistics function on page load
document.addEventListener('DOMContentLoaded', fetchAndUpdateRescueOperationStatistics);
