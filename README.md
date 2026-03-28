# Cinema E-Booking System — Team 9
CSCI 4050 Software Engineering

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Database:** MySQL
- **ORM:** Sequelize

## How to Run

### 1. Install and start MySQL
Make sure MySQL is installed and running on your machine.

### 2. Seed the database
```bash
mysql -u root < database/seed.sql
```
This creates the `cinema_ebooking` database and inserts the initial movie data. All other tables (users, addresses, payment_cards, favorites, showtimes, etc.) are automatically created by Sequelize when the server starts.

### 3. Configure environment variables
Create a `.env` file in the root of the project:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=cinema_ebooking
JWT_SECRET=your_jwt_secret_here
AES_KEY=your_64_char_hex_key_here
BASE_URL=http://localhost:3000
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 4. Install dependencies
```bash
npm install
```

### 5. Start the server
```bash
npm start
```

Open **http://localhost:3000**