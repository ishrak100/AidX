// Fetch volunteer data when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetchVolunteerData(); // Automatically fetch all the volunteer data
    loadVolunteerStatistics(); // Load statistics
});

// Function to load volunteer statistics
async function loadVolunteerStatistics() {
    try {
        const response = await fetch('/volunteers/api/statistics');
        const data = await response.json();
        
        // Update statistics
        document.getElementById('Total').textContent = data.volunteerCount || 0;
        document.getElementById('Available').textContent = data.availableCount || 0;
        
        // Update most recent volunteer
        if (data.recentVolunteer) {
            document.getElementById('volunteerName').textContent = data.recentVolunteer.Name || 'N/A';
            document.getElementById('volunteerSkills').textContent = data.recentVolunteer.Skills || 'N/A';
            document.getElementById('volunteerStatus').textContent = data.recentVolunteer.AvailabilityStatus || 'N/A';
        } else {
            document.getElementById('volunteerName').textContent = 'N/A';
            document.getElementById('volunteerSkills').textContent = 'N/A';
            document.getElementById('volunteerStatus').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error loading volunteer statistics:', error);
    }
}
  
  // Function to fetch all volunteer data from the backend
  function fetchVolunteerData() {
    const url = '/volunteers/api';  // Fetch all volunteers from the backend
  
    fetch(url)
      .then(response => response.json())
      .then(data => {
        populateVolunteerTable(data);  // Populate the table with all volunteer data
      })
      .catch(error => console.error('Error fetching volunteer data:', error));
  }
  
  // Function to populate the volunteer table with fetched data
  function populateVolunteerTable(data) {
    const tableBody = document.querySelector('#volunteersTable tbody');
    tableBody.innerHTML = '';  // Clear the table before appending new data
  
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(volunteer => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', volunteer.VolunteerID);  // Store the volunteer ID in the row (hidden for backend)
  
        row.innerHTML = `
          <td>${volunteer.VolunteerID}</td>
          <td>${volunteer.FirstName}</td>
          <td>${volunteer.LastName}</td>
          <td>${volunteer.ContactNumber}</td>
          <td>${volunteer.Skills}</td>
          <td>${volunteer.AvailabilityStatus}</td>
          <td>
            <button class="editButton" onclick="editVolunteer(${volunteer.VolunteerID})">Edit</button>
            <button class="deleteButton" onclick="deleteVolunteer(${volunteer.VolunteerID})">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      tableBody.innerHTML = '<tr><td colspan="7">No data found</td></tr>';
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
  
    const url = `/volunteers/api/search?query=${searchQuery}`;  // Adjusted for volunteer search
  
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        populateVolunteerTable(data);  // Update the table with new data
      })
      .catch(error => console.error('Error fetching data:', error));
  }
  

  // Open Modal to add volunteer
document.getElementById('addVolunteer').addEventListener('click', function () {
    document.getElementById('addVolunteerModal').style.display = 'block';
  });
  
  // Close Modal when clicking the "X" button
  document.getElementById('closeModal').addEventListener('click', function () {
    document.getElementById('addVolunteerModal').style.display = 'none';
  });
  
  // Handle Form Submission for adding a volunteer
  document.getElementById('addVolunteerForm').addEventListener('submit', function (event) {
    event.preventDefault();
  
    const formData = new FormData(this);
    let data = Object.fromEntries(formData);
  
    console.log("Data sent:", data);
  
    fetch('/volunteers/api/addVolunteer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
      alert(result.message);  // Show success message
      document.getElementById('addVolunteerModal').style.display = 'none';  // Close modal
      fetchVolunteerData();  // Optionally refresh the volunteer data
      loadVolunteerStatistics(); // Refresh statistics
    })
    .catch(error => console.error('Error adding volunteer:', error));
  });
  


  // Function to delete a volunteer
function deleteVolunteer(volunteerId) {
  if (!confirm("Are you sure you want to delete this volunteer?")) {
    return;
  }

  fetch(`/volunteers/api/delete/${volunteerId}`, {
    method: 'DELETE'
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);  // Show success message
    fetchVolunteerData();  // Optionally refresh the volunteer data
    loadVolunteerStatistics(); // Refresh statistics
  })
  .catch(error => console.error('Error deleting volunteer:', error));
}



// Function to open the Edit Modal and populate it with data
function editVolunteer(volunteerId) {
  fetch(`/volunteers/api/${volunteerId}`)
    .then(response => response.json())
    .then(data => {
      if (!data) {
        alert("Volunteer not found!");
        return;
      }

      // Fill the form with existing details
      document.getElementById('editVolunteerID').value = data.VolunteerID;
      document.getElementById('editFirstName').value = data.FirstName;
      document.getElementById('editLastName').value = data.LastName;
      document.getElementById('editContactNumber').value = data.ContactNumber;
      document.getElementById('editSkills').value = data.Skills;
      document.getElementById('editAvailabilityStatus').value = data.AvailabilityStatus;

      // Show the edit modal
      document.getElementById('editVolunteerModal').style.display = 'block';
    })
    .catch(error => console.error('Error fetching volunteer details:', error));
}

// Close Edit Modal
document.getElementById('closeEditModal').addEventListener('click', function () {
  document.getElementById('editVolunteerModal').style.display = 'none';
});


// Handle Edit Form Submission
document.getElementById('editVolunteerForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const volunteerId = document.getElementById('editVolunteerID').value;
  const updatedData = {
    FirstName: document.getElementById('editFirstName').value,
    LastName: document.getElementById('editLastName').value,
    ContactNumber: document.getElementById('editContactNumber').value,
    Skills: document.getElementById('editSkills').value,
    AvailabilityStatus: document.getElementById('editAvailabilityStatus').value
  };

  fetch(`/volunteers/api/update/${volunteerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);
    document.getElementById('editVolunteerModal').style.display = 'none';
    fetchVolunteerData();  // Optionally refresh the volunteer data
    loadVolunteerStatistics(); // Refresh statistics
  })
  .catch(error => console.error('Error updating volunteer:', error));
});
