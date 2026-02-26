# Cinema E-Booking System — Team 9
CSCI 4050 Software Engineering

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** MySQL

## How to Run

### 1. Install and start MySQL
Make sure MySQL is installed and running on your machine.

### 2. Seed the database
```bash
mysql -u root < database/seed.sql
```

### 3. Configure database credentials
Create a `.env` file in the root of the project with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=cinema_ebooking
```

### 4. Install dependencies
```bash
npm install
```

### 5. Start the server
```bash
node server.js
```

Open **http://localhost:3000**
