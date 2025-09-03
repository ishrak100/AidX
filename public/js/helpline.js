// Fetch helpline data when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetchHelpLineData(); // Automatically fetch all the helpline data
    fetchHelpLineStatistics(); // Fetch statistics
});

// Function to fetch all helpline data from the backend
function fetchHelpLineData() {
    const url = '/helpline/api';  // Fetch all helplines from the backend

    fetch(url)
        .then(response => response.json())
        .then(data => {
            populateHelpLineTable(data);  // Populate the table with all helpline data
        })
        .catch(error => console.error('Error fetching helpline data:', error));
}

// Function to populate the helpline table with fetched data
function populateHelpLineTable(data) {
    const tableBody = document.querySelector('#helplineTable tbody');
    tableBody.innerHTML = '';  // Clear the table before appending new data

    if (Array.isArray(data) && data.length > 0) {
        data.forEach(helpline => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', helpline.HelpLineID);  // Store the helpline ID in the row

            // Format location display
            const locationDisplay = helpline.Location || 'N/A';

            row.innerHTML = `
                <td>${helpline.HelpLineID}</td>
                <td>${helpline.LocalAdministration}</td>
                <td>${helpline.CentralAdministration}</td>
                <td>${helpline.NGO}</td>
                <td>${helpline.FireService}</td>
                <td>${helpline.Ambulance}</td>
                <td>${locationDisplay}</td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="editHelpLine(${helpline.HelpLineID})">Edit</button>
                        <button class="delete-btn" onclick="deleteHelpLine(${helpline.HelpLineID})">Delete</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="8">No data found</td></tr>';
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

    const url = `/helpline/api/search?query=${searchQuery}`;  // Adjusted for helpline search

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            populateHelpLineTable(data);  // Update the table with new data
        })
        .catch(error => console.error('Error fetching data:', error));
}

// Fetch helpline statistics and display them in the HTML container
function fetchHelpLineStatistics() {
    fetch('/helpline/api/helpline-statistics')
        .then(response => response.json())
        .then(data => {
            const { totalHelpLines, totalLocations, recentHelpLine } = data;
            
            // Update the statistics in the HTML
            document.getElementById('helplineCount').textContent = totalHelpLines;
            document.getElementById('locationCount').textContent = totalLocations;
            
            // Update recent helpline info
            if (recentHelpLine) {
                document.getElementById('localAdmin').textContent = recentHelpLine.LocalAdministration || 'N/A';
                document.getElementById('ngo').textContent = recentHelpLine.NGO || 'N/A';
                
                // Format location display
                const locationDisplay = recentHelpLine.Division && recentHelpLine.District && recentHelpLine.Area ? 
                    `${recentHelpLine.Division}, ${recentHelpLine.District}, ${recentHelpLine.Area}` : 
                    'N/A';
                document.getElementById('location').textContent = locationDisplay;
            }
        })
        .catch(error => console.error('Error fetching helpline statistics:', error));
}

// Open Modal to add helpline
document.getElementById('addHelpLine').addEventListener('click', function () {
    document.getElementById('addHelpLineModal').style.display = 'block';
});

// Close Modal when clicking the "X" button
document.getElementById('closeModal').addEventListener('click', function () {
    document.getElementById('addHelpLineModal').style.display = 'none';
});

// Handle Form Submission for adding a helpline
document.getElementById('addHelpLineForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    let data = Object.fromEntries(formData);

    console.log("Data sent:", data);

    fetch('/helpline/api/addHelpLine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        alert(result.message);  // Show success message
        document.getElementById('addHelpLineModal').style.display = 'none';  // Close modal
        fetchHelpLineData();  // Refresh the helpline data
        fetchHelpLineStatistics(); // Refresh statistics
    })
    .catch(error => console.error('Error adding helpline:', error));
});

// Function to delete a helpline
function deleteHelpLine(helplineId) {
    if (!confirm("Are you sure you want to delete this helpline?")) {
        return;
    }

    fetch(`/helpline/api/delete/${helplineId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(result => {
        alert(result.message);  // Show success message
        fetchHelpLineData();  // Refresh the helpline data
        fetchHelpLineStatistics(); // Refresh statistics
    })
    .catch(error => console.error('Error deleting helpline:', error));
}

// Function to open the Edit Modal and populate it with data
function editHelpLine(helplineId) {
    fetch(`/helpline/api/${helplineId}`)
        .then(response => response.json())
        .then(data => {
            if (!data) {
                alert("HelpLine not found!");
                return;
            }

            // Fill the form with existing details
            document.getElementById('editHelpLineID').value = data.HelpLineID;
            document.getElementById('editLocalAdministration').value = data.LocalAdministration;
            document.getElementById('editCentralAdministration').value = data.CentralAdministration;
            document.getElementById('editNGO').value = data.NGO;
            document.getElementById('editFireService').value = data.FireService;
            document.getElementById('editAmbulance').value = data.Ambulance;
            document.getElementById('editDivision').value = data.Division || '';
            document.getElementById('editDistrict').value = data.District || '';
            document.getElementById('editArea').value = data.Area || '';

            // Show the edit modal
            document.getElementById('editHelpLineModal').style.display = 'block';
        })
        .catch(error => console.error('Error fetching helpline details:', error));
}

// Close Edit Modal
document.getElementById('closeEditModal').addEventListener('click', function () {
    document.getElementById('editHelpLineModal').style.display = 'none';
});

// Handle Edit Form Submission
document.getElementById('editHelpLineForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const helplineId = document.getElementById('editHelpLineID').value;
    const updatedData = {
        LocalAdministration: document.getElementById('editLocalAdministration').value,
        CentralAdministration: document.getElementById('editCentralAdministration').value,
        NGO: document.getElementById('editNGO').value,
        FireService: document.getElementById('editFireService').value,
        Ambulance: document.getElementById('editAmbulance').value,
        Division: document.getElementById('editDivision').value,
        District: document.getElementById('editDistrict').value,
        Area: document.getElementById('editArea').value
    };

    fetch(`/helpline/api/update/${helplineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
    })
    .then(response => response.json())
    .then(result => {
        alert(result.message);
        document.getElementById('editHelpLineModal').style.display = 'none';
        fetchHelpLineData();  // Refresh the helpline data
        fetchHelpLineStatistics(); // Refresh statistics
    })
    .catch(error => console.error('Error updating helpline:', error));
});
