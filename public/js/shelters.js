// Fetch shelter data when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetchShelterData(); // Automatically fetch all the shelter data
  });
  
  // Function to fetch all shelter data from the backend
  function fetchShelterData() {
    console.log('Fetching shelter data...'); // Debug log
    const url = '/shelters/api';  // Fetch all shelters from the backend
  
    fetch(url)
      .then(response => {
        console.log('Shelters response status:', response.status); // Debug log
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Shelter data received:', data); // Debug log
        populateShelterTable(data);  // Populate the table with all shelter data
      })
      .catch(error => {
        console.error('Error fetching shelter data:', error);
        // Show error message to user
        const tableBody = document.querySelector('#sheltersTable tbody');
        tableBody.innerHTML = '<tr><td colspan="8">Error loading data. Check console for details.</td></tr>';
      });
  }
  
  // Function to populate the shelter table with fetched data
  function populateShelterTable(data) {
    console.log('Populating shelter table with data:', data); // Debug log
    const tableBody = document.querySelector('#sheltersTable tbody');
    tableBody.innerHTML = '';  // Clear the table before appending new data
  
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(shelter => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', shelter.ShelterID);  // Store the shelter ID in the row
  
        row.innerHTML = `
          <td>${shelter.ShelterID}</td>
          <td>${shelter.Name}</td>
          <td>${shelter.Capacity}</td>
          <td>${shelter.CurrentOccupancy}</td>
          <td>${shelter.ContactNumber}</td>
          <td>${shelter.Location}</td>
          <td>${shelter.AvailableResources}</td>
          <td>
            <button class="editButton" onclick="editShelter(${shelter.ShelterID})">Edit</button>
            <button class="deleteButton" onclick="deleteShelter(${shelter.ShelterID})">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
      console.log('Shelter table populated successfully with', data.length, 'rows'); // Debug log
    } else {
      tableBody.innerHTML = '<tr><td colspan="8">No shelter data found</td></tr>';
      console.log('No shelter data to display'); // Debug log
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

  const url = `/shelters/api/search?query=${searchQuery}`;  // Adjusted for shelter search

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      populateShelterTable(data);  // Update the table with new data
    })
    .catch(error => console.error('Error fetching data:', error));
}


// Open Modal
document.getElementById('addShelter').addEventListener('click', function () {
  document.getElementById('addShelterModal').style.display = 'block';
});

// Close Modal
document.getElementById('closeModal').addEventListener('click', function () {
  document.getElementById('addShelterModal').style.display = 'none';
});

// Close Edit Modal
document.getElementById('closeEditModal').addEventListener('click', function () {
  document.getElementById('editShelterModal').style.display = 'none';
});

// Close modal when clicking outside of it
window.addEventListener('click', function (event) {
  const addModal = document.getElementById('addShelterModal');
  const editModal = document.getElementById('editShelterModal');
  if (event.target == addModal) {
    addModal.style.display = 'none';
  }
  if (event.target == editModal) {
    editModal.style.display = 'none';
  }
});

// Handle form submission for adding shelter
document.getElementById('addShelterForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const shelterData = Object.fromEntries(formData.entries());

  fetch('/shelters/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shelterData)
  })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      document.getElementById('addShelterModal').style.display = 'none';
      this.reset();
      fetchShelterData(); // Refresh the table
    })
    .catch(error => console.error('Error:', error));
});

// Handle form submission for editing shelter
document.getElementById('editShelterForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const shelterData = Object.fromEntries(formData.entries());
  const shelterID = document.getElementById('editShelterID').value;

  fetch(`/shelters/api/${shelterID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shelterData)
  })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      document.getElementById('editShelterModal').style.display = 'none';
      fetchShelterData(); // Refresh the table
    })
    .catch(error => console.error('Error:', error));
});

// Function to open edit modal and populate with shelter data
function editShelter(shelterID) {
  fetch(`/shelters/api/${shelterID}`)
    .then(response => response.json())
    .then(shelter => {
      document.getElementById('editShelterID').value = shelter.ShelterID;
      document.getElementById('editName').value = shelter.Name;
      document.getElementById('editCapacity').value = shelter.Capacity;
      document.getElementById('editCurrentOccupancy').value = shelter.CurrentOccupancy;
      document.getElementById('editContactNumber').value = shelter.ContactNumber;
      document.getElementById('editDivision').value = shelter.Division;
      document.getElementById('editDistrict').value = shelter.District;
      document.getElementById('editArea').value = shelter.Area;
      document.getElementById('editAvailableResources').value = shelter.AvailableResources;
      
      document.getElementById('editShelterModal').style.display = 'block';
    })
    .catch(error => console.error('Error:', error));
}

// Function to delete shelter
function deleteShelter(shelterID) {
  if (confirm('Are you sure you want to delete this shelter?')) {
    fetch(`/shelters/api/${shelterID}`, {
      method: 'DELETE'
    })
      .then(response => response.json())
      .then(data => {
        console.log('Success:', data);
        fetchShelterData(); // Refresh the table
      })
      .catch(error => console.error('Error:', error));
  }
}

// Load shelter statistics
async function loadShelterStatistics() {
    try {
        const response = await fetch('/shelters/api/statistics');
        const data = await response.json();
        
        document.getElementById('shelterCount').textContent = data.shelterCount || 0;
        document.getElementById('availableCapacity').textContent = data.availableCapacity || 0;
        
        if (data.recentShelter && typeof data.recentShelter === 'object') {
            document.getElementById('shelterName').textContent = data.recentShelter.Name || 'N/A';
            document.getElementById('shelterCapacity').textContent = data.recentShelter.Capacity || 'N/A';
            document.getElementById('shelterLocation').textContent = data.recentShelter.Location || 'N/A';
        } else {
            document.getElementById('shelterName').textContent = 'N/A';
            document.getElementById('shelterCapacity').textContent = 'N/A';
            document.getElementById('shelterLocation').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error loading shelter statistics:', error);
        // Set default values in case of error
        document.getElementById('shelterCount').textContent = '0';
        document.getElementById('availableCapacity').textContent = '0';
        document.getElementById('shelterName').textContent = 'N/A';
        document.getElementById('shelterCapacity').textContent = 'N/A';
        document.getElementById('shelterLocation').textContent = 'N/A';
    }
}

// Load shelter statistics when page loads
document.addEventListener('DOMContentLoaded', loadShelterStatistics);
