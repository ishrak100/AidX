// Fetch medical data when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    fetchMedicalData(); // Automatically fetch all the medical data
    loadMedicalStatistics(); // Load statistics
});

// Function to load medical statistics
async function loadMedicalStatistics() {
    try {
        const response = await fetch('/medical/api/statistics');
        const data = await response.json();
        
        // Update statistics
        document.getElementById('medicalCount').textContent = data.medicalCount || 0;
        document.getElementById('patientCount').textContent = data.patientCount || 0;
        
        // Update most recent medical report
        if (data.recentReport) {
            document.getElementById('patientName').textContent = data.recentReport.PatientName || 'N/A';
            document.getElementById('medicalCondition').textContent = data.recentReport.MedicalCondition || 'N/A';
            document.getElementById('treatment').textContent = data.recentReport.Treatment || 'N/A';
        } else {
            document.getElementById('patientName').textContent = 'N/A';
            document.getElementById('medicalCondition').textContent = 'N/A';
            document.getElementById('treatment').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error loading medical statistics:', error);
    }
}

// Function to fetch all medical data from the backend
function fetchMedicalData() {
    console.log('Fetching medical data...'); // Debug log
    const url = '/medical/api';  // Fetch all medical reports from the backend

    fetch(url)
        .then(response => {
            console.log('Medical response status:', response.status); // Debug log
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Medical data received:', data); // Debug log
            populateMedicalTable(data);  // Populate the table with all medical data
        })
        .catch(error => {
            console.error('Error fetching medical data:', error);
            // Show error message to user
            const tableBody = document.querySelector('#medicalTable tbody');
            tableBody.innerHTML = '<tr><td colspan="5">Error loading data. Check console for details.</td></tr>';
        });
}

// Function to populate the medical table with fetched data
function populateMedicalTable(data) {
    console.log('Populating medical table with data:', data); // Debug log
    const tableBody = document.querySelector('#medicalTable tbody');
    tableBody.innerHTML = '';  // Clear the table before appending new data

    if (Array.isArray(data) && data.length > 0) {
        data.forEach(medical => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', medical.ReportID);  // Store the report ID in the row

            row.innerHTML = `
                <td>${medical.ReportID}</td>
                <td>${medical.PatientName}</td>
                <td>${medical.MedicalCondition}</td>
                <td>${medical.Treatment}</td>
                <td>
                    <button class="edit-btn" onclick="editMedical(${medical.ReportID})">Edit</button>
                    <button class="delete-btn" onclick="deleteMedical(${medical.ReportID})">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        console.log('Medical table populated successfully');
    } else {
        console.log('No medical data to display');
        tableBody.innerHTML = '<tr><td colspan="5">No medical reports found</td></tr>';
    }
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const tableRows = document.querySelectorAll('#medicalTable tbody tr');
    
    tableRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// Modal functionality
const addModal = document.getElementById('addMedicalModal');
const editModal = document.getElementById('editMedicalModal');
const addBtn = document.getElementById('addMedical');
const closeModal = document.getElementById('closeModal');
const closeEditModal = document.getElementById('closeEditModal');

// Open add modal
addBtn.addEventListener('click', () => {
    addModal.style.display = 'block';
});

// Close modals
closeModal.addEventListener('click', () => {
    addModal.style.display = 'none';
});

closeEditModal.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === addModal) {
        addModal.style.display = 'none';
    }
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
});

// Add medical report form submission
document.getElementById('addMedicalForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const medicalData = Object.fromEntries(formData);
    
    console.log('Submitting medical data:', medicalData);
    
    fetch('/medical/api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicalData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Medical report added successfully:', data);
        addModal.style.display = 'none';
        this.reset();
        fetchMedicalData(); // Refresh the table
        loadMedicalStatistics(); // Refresh statistics
        alert('Medical report added successfully!');
    })
    .catch(error => {
        console.error('Error adding medical report:', error);
        alert('Error adding medical report. Please try again.');
    });
});

// Edit medical report function
function editMedical(reportId) {
    console.log('Editing medical report with ID:', reportId);
    
    // Find the medical data in the current table
    const row = document.querySelector(`tr[data-id="${reportId}"]`);
    if (!row) {
        console.error('Medical report row not found');
        return;
    }
    
    // Extract data from the row
    const cells = row.children;
    const reportID = cells[0].textContent;
    const patientName = cells[1].textContent;
    const medicalCondition = cells[2].textContent;
    const treatment = cells[3].textContent;
    
    // Populate the edit form
    document.getElementById('editReportID').value = reportID;
    document.getElementById('editPatientName').value = patientName;
    document.getElementById('editMedicalCondition').value = medicalCondition;
    document.getElementById('editTreatment').value = treatment;
    
    // Show the edit modal
    editModal.style.display = 'block';
}

// Edit medical report form submission
document.getElementById('editMedicalForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const reportId = document.getElementById('editReportID').value;
    const formData = new FormData(this);
    const medicalData = Object.fromEntries(formData);
    
    console.log('Updating medical report:', reportId, medicalData);
    
    fetch(`/medical/api/${reportId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicalData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Medical report updated successfully:', data);
        editModal.style.display = 'none';
        fetchMedicalData(); // Refresh the table
        loadMedicalStatistics(); // Refresh statistics
        alert('Medical report updated successfully!');
    })
    .catch(error => {
        console.error('Error updating medical report:', error);
        alert('Error updating medical report. Please try again.');
    });
});

// Delete medical report function
function deleteMedical(reportId) {
    if (confirm('Are you sure you want to delete this medical report?')) {
        console.log('Deleting medical report with ID:', reportId);
        
        fetch(`/medical/api/${reportId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Medical report deleted successfully:', data);
            fetchMedicalData(); // Refresh the table
            loadMedicalStatistics(); // Refresh statistics
            alert('Medical report deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting medical report:', error);
            alert('Error deleting medical report. Please try again.');
        });
    }
}
