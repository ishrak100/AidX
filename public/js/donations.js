// Function to format date for display in table (DD MMM, YYYY)
function formatDateForDisplay(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit' 
    };
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString; // Return original string if formatting fails
  }
}

// Function to format date for input field (YYYY-MM-DD)
function formatDateForInput(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Date input formatting error:', error);
    return '';
  }
}

// Fetch donation data when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetchDonationData(); // Automatically fetch all donation data
  });
  
  // Function to fetch all donation data from the backend
  function fetchDonationData() {
    const url = '/donations/api';  // Fetch all donations from the backend
  
    fetch(url)
      .then(response => response.json())
      .then(data => {
        populateDonationTable(data);  // Populate the table with donation data
      })
      .catch(error => console.error('Error fetching donation data:', error));
  }
  
  // Function to populate the donation table with fetched data
  function populateDonationTable(data) {
    const tableBody = document.querySelector('#donationsTable tbody');
    tableBody.innerHTML = '';  // Clear the table before appending new data
  
    if (Array.isArray(data) && data.length > 0) {
      data.forEach(donation => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', donation.DonationID);  // Store the donation ID in the row (hidden for backend)
  
        row.innerHTML = `
          <td>${donation.DonationID}</td>
          <td>${donation.DonorName}</td>
          <td>${donation.ResourceType || 'Money'}</td>
          <td>${donation.Region}</td>
          <td>${donation.Quantity || ''}</td>
          <td>${donation.Amount || ''}</td>
          <td>${formatDateForDisplay(donation.Date)}</td>
          <td>
            <button class="editButton" onclick="editDonation(${donation.DonationID})">Edit</button>
            <button class="deleteButton" onclick="deleteDonation(${donation.DonationID})">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      tableBody.innerHTML = '<tr><td colspan="8">No data found</td></tr>';
    }
  }
  
  // Filter donations by search
  // Add Enter key functionality to search input
  document.getElementById('searchInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      fetchFilteredDonationData();
    }
  });

  // Add input event listener for real-time search
  document.getElementById('searchInput').addEventListener('input', fetchFilteredDonationData);
  
  function fetchFilteredDonationData() {
    let searchQuery = document.getElementById('searchInput').value.trim(); // Trim spaces
  
    searchQuery = searchQuery ? encodeURIComponent(searchQuery) : '';
  
    const url = `/donations/api/search?query=${searchQuery}`;
  
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        populateDonationTable(data); // Update the table with filtered data
      })
      .catch(error => console.error('Error fetching donation data:', error));
  }
  


  document.getElementById('addDonation').addEventListener('click', function () {
    document.getElementById('addDonationModal').style.display = 'block';
  });
  
  // Close Modal
  document.getElementById('closeModal').addEventListener('click', function () {
    document.getElementById('addDonationModal').style.display = 'none';
  });
  




  document.getElementById('addDonationForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    let data = Object.fromEntries(formData);

    // Ensure Date is formatted as YYYY-MM-DD before sending to the backend
    if (data.Date) {
        data.Date = new Date(data.Date).toISOString().split('T')[0];  // Format to YYYY-MM-DD
    }

    console.log("Data sent:", data);

    fetch('/donations/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        alert(result.message);
        document.getElementById('addDonationModal').style.display = 'none';
        // Refresh donations table or trigger any update
    })
    .catch(error => console.error('Error adding donation:', error));
});





// Close the modal when the close button is clicked
document.getElementById('closeeditModal').addEventListener('click', function () {
  document.getElementById('editDonationModal').style.display = 'none';
});


// Function to open the edit modal and populate it with donation data
function editDonation(donationId) {
  // Fetch donation data by ID from the server
  fetch(`/donations/api/${donationId}`)
    .then(response => response.json())
    .then(donation => {
      // Populate the modal fields with fetched donation data
      document.getElementById('editDonationID').value = donation.DonationID;
      document.getElementById('editDonorName').value = donation.DonorName;
      document.getElementById('editResourceType').value = donation.ResourceType || '';
      document.getElementById('editCity').value = donation.Division;
      document.getElementById('editState').value = donation.District;
      document.getElementById('editCountry').value = donation.Area;
      document.getElementById('editQuantity').value = donation.Quantity || '';
      document.getElementById('editAmount').value = donation.Amount || '';
      document.getElementById('editDate').value = formatDateForInput(donation.Date);

      // Show the edit modal
      document.getElementById('editDonationModal').style.display = 'block';
    })
    .catch(error => console.error('Error fetching donation data:', error));
}



// Handle the form submission for updating donation
document.getElementById('editDonationForm').addEventListener('submit', function(event) {
  event.preventDefault();  // Prevent form submission

  const donationId = document.getElementById('editDonationID').value;
  const updatedData = {
    DonorName: document.getElementById('editDonorName').value,
    ResourceType: document.getElementById('editResourceType').value,
    City: document.getElementById('editCity').value,
    State: document.getElementById('editState').value,
    Country: document.getElementById('editCountry').value,
    Quantity: document.getElementById('editQuantity').value,
    Amount: document.getElementById('editAmount').value,
    Date: document.getElementById('editDate').value
  };

  // Send the updated data to the server
  fetch(`/donations/api/update/${donationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  })
  .then(response => response.json())
  .then(result => {
    alert(result.message);  // Show a success message
    document.getElementById('editDonationModal').style.display = 'none';  // Close the modal
    fetchDonationData()  // Refresh the donation table
  })
  .catch(error => console.error('Error updating donation:', error));
});


// Function to delete a donation
function deleteDonation(donationId) {
  if (!confirm("Are you sure you want to delete this donation?")) {
    return;
  }

  console.log("Deleting donation with ID:", donationId);

  // Send DELETE request to backend
  fetch(`/donations/api/delete/${donationId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(result => {
      alert(result.message); // Show success message
      fetchDonationData(); // Refresh the donations table after deletion
    })
    .catch(error => {
      console.error('Error deleting donation:', error);
      alert('There was an error deleting the donation.');
    });
}

// Function to fetch and update donation statistics
function fetchAndUpdateDonationStatistics() {
  fetch('/donations/api/statistics')
    .then(response => response.json())
    .then(data => {
      // Update the statistics section with fetched data
      document.getElementById('donationCount').textContent = data.donationCount || 0;
      document.getElementById('totalAmount').textContent = `$${(data.totalAmount || 0).toLocaleString()}`;
      
      // Extract recent donation details
      if (data.recentDonation && typeof data.recentDonation === 'object') {
        document.getElementById('donorName').textContent = data.recentDonation.DonorName || 'N/A';
        document.getElementById('donationAmount').textContent = `$${(data.recentDonation.Amount || 0).toLocaleString()}`;
        document.getElementById('donationType').textContent = data.recentDonation.DonationType || 'N/A';
      } else {
        document.getElementById('donorName').textContent = 'N/A';
        document.getElementById('donationAmount').textContent = 'N/A';
        document.getElementById('donationType').textContent = 'N/A';
      }
    })
    .catch(error => {
      console.error('Error fetching donation statistics:', error);
      // Set default values in case of error
      document.getElementById('donationCount').textContent = '0';
      document.getElementById('totalAmount').textContent = '$0';
      document.getElementById('donorName').textContent = 'N/A';
      document.getElementById('donationAmount').textContent = 'N/A';
      document.getElementById('donationType').textContent = 'N/A';
    });
}

// Call the statistics function on page load
document.addEventListener('DOMContentLoaded', fetchAndUpdateDonationStatistics);
