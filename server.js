require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const server = express();

server.use(express.static("public"));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((error) => {
  if (error) {
    console.error("Database connection failed:", error);
    return;
  }
  console.log("Connected to database");
});

// 2.1, 2.3, 2.4: Get all movies with optional title search and genre filter
server.get("/api/movies", (req, res) => {
  let query = "SELECT movie_id, title, genre, rating, status FROM movies";
  let params = [];
  let conditions = [];

  if (req.query.q) {
    conditions.push("title LIKE ?");
    params.push(`%${req.query.q}%`);
  }

  if (req.query.genre) {
    conditions.push("genre = ?");
    params.push(req.query.genre);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  db.query(query, params, (error, data) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data);
  });
});

// 2.2: Get single movie by ID (full details for Movie Details Page)
server.get("/api/movies/:id", (req, res) => {
  const query = "SELECT * FROM movies WHERE movie_id = ?";
  db.query(query, [req.params.id], (error, data) => {
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (data.length === 0) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }
    res.json(data[0]);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
