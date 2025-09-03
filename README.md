# AidX - Disaster Management System

A comprehensive disaster management system built with Node.js, Express.js, and MySQL to help coordinate disaster response efforts.

## Features

- **Disaster Management**: Track and manage disaster events with location data
- **Victim Management**: Record and manage victim information
- **Volunteer Coordination**: Organize volunteer efforts and assignments
- **Donation Tracking**: Monitor donations and resource allocation
- **Rescue Operations**: Coordinate rescue team activities
- **Medical Assistance**: Track medical aid and health services
- **Shelter Management**: Manage temporary shelter facilities
- **Helpline Services**: Provide communication support

## Technologies Used

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web application framework
- **MySQL** - Database management
- **MySQL2** - MySQL client for Node.js
- **Moment.js** - Date/time manipulation

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with modern animations
- **JavaScript** - Client-side functionality
- **AJAX** - Asynchronous data operations

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ishrak100/AidX.git
   cd AidX
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL database**
   - Create a MySQL database named `aidx_db`
   - Configure database connection in `config/db.js`
   - Import the required tables

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
AidX/
├── config/
│   └── db.js              # Database configuration
├── public/
│   ├── css/               # Stylesheets for each module
│   └── js/                # Client-side JavaScript
├── routes/
│   ├── disastersRoutes.js # Disaster management APIs
│   ├── victimsRoutes.js   # Victim management APIs
│   ├── volunteersRoutes.js # Volunteer coordination APIs
│   ├── donationsRoutes.js # Donation tracking APIs
│   ├── rescueoperationsRoutes.js # Rescue operations APIs
│   ├── medicalRoutes.js   # Medical assistance APIs
│   ├── sheltersRoutes.js  # Shelter management APIs
│   └── helplineRoutes.js  # Helpline services APIs
├── views/
│   └── *.html             # Frontend HTML pages
├── server.js              # Main server file
└── package.json           # Project dependencies
```

## API Endpoints

### Disasters
- `GET /disasters/api` - Fetch all disasters
- `POST /disasters/api/add` - Add new disaster
- `PUT /disasters/api/update/:id` - Update disaster
- `DELETE /disasters/api/delete/:id` - Delete disaster
- `GET /disasters/api/search` - Search disasters
- `GET /disasters/api/statistics` - Get disaster statistics

### Other Modules
Each module (victims, volunteers, donations, etc.) follows similar CRUD operations with their respective endpoints.

## Database Schema

The system uses a normalized MySQL database with the following main tables:
- `Disaster` - Disaster event information
- `Location` - Geographic location data
- `Victim` - Victim information and status
- `Volunteer` - Volunteer details and assignments
- `Donation` - Donation records and tracking
- `RescueOperation` - Rescue team activities
- `Medical` - Medical assistance records
- `Shelter` - Temporary shelter information
- `Helpline` - Communication support records

## Features Highlights

### Full CRUD Operations
- **C**reate - Add new records
- **R**ead - View and search records
- **U**pdate - Edit existing records
- **D**elete - Remove records

### Advanced Functionality
- Real-time statistics dashboard
- Search and filter capabilities
- Responsive design for mobile compatibility
- Data validation and error handling
- Normalized database relationships

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

**Ishrak Faisal** - [ishrak100](https://github.com/ishrak100)

## Acknowledgments

- Built for disaster management and emergency response coordination
- Designed to help communities during crisis situations
- Focuses on efficient resource allocation and victim assistance