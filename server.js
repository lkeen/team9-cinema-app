require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const {
  sequelize,
  User,
  Address,
  PaymentCard,
  Movie,
  Showtime,
  Showroom,
  Favorite,
  VerificationToken,
  PasswordResetToken,
  Booking,
  BookedSeat,
  Promotion,
  TicketPrice,
  Order,
  Payment,
} = require("./models");

const server = express();

server.use(express.static("public"));
server.use(express.json());

// ─── AES-256-CBC Encryption Helpers ───

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.AES_KEY, "hex"),
    iv
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encrypted) {
  const parts = encrypted.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.AES_KEY, "hex"),
    iv
  );
  let decrypted = decipher.update(parts[1], "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ─── Password Validation ───

function validatePassword(password) {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.";
  }
  return null;
}

// ─── JWT Authentication Middleware ───

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function optionalUser(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── Email Setup ───

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"Cinema E-Booking" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send error:", err.message);
  }
}

function verificationEmail(name, link) {
  return `<h2>Welcome to Cinema E-Booking, ${name}!</h2>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:#007bff;color:white;text-decoration:none;border-radius:4px;">Verify Email</a>
    <p>This link expires in 24 hours.</p>`;
}

function resetPasswordEmail(name, link) {
  return `<h2>Password Reset Request</h2>
    <p>Hi ${name}, click the link below to reset your password:</p>
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:#007bff;color:white;text-decoration:none;border-radius:4px;">Reset Password</a>
    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`;
}

function profileChangeEmail(name, changes) {
  return `<h2>Profile Updated</h2>
    <p>Hi ${name}, your profile has been updated:</p>
    <ul>${changes.map((c) => `<li>${c}</li>`).join("")}</ul>
    <p>If you did not make these changes, please contact support immediately.</p>`;
}

function passwordChangeEmail(name) {
  return `<h2>Password Changed</h2>
    <p>Hi ${name}, your password has been successfully changed.</p>
    <p>If you did not make this change, please contact support immediately.</p>`;
}

function promotionEmail(name, promo) {
  return `<h2>Promotion: ${promo.code}</h2>
    <p>Hi ${name},</p>
    <p>${promo.description || "Check out our latest promotion!"}</p>
    <p><strong>Code:</strong> ${promo.code}</p>
    <p><strong>Discount:</strong> ${promo.discount_percent}%</p>
    <p><strong>Valid:</strong> ${promo.start_date} to ${promo.end_date}</p>`;
}

function orderConfirmationEmail(name, info) {
  const seatRows = info.seats
    .map(
      (s) =>
        `<tr><td>${s.seat_label}</td><td>${s.ticket_type}</td><td style="text-align:right;">$${Number(s.price).toFixed(2)}</td></tr>`
    )
    .join("");
  return `<h2>Booking Confirmed!</h2>
    <p>Hi ${name}, thanks for your purchase. Here are your booking details:</p>
    <p><strong>Confirmation #:</strong> ${info.bookingId}</p>
    <p><strong>Movie:</strong> ${info.movieTitle}<br>
    <strong>Showroom:</strong> ${info.showroomName}<br>
    <strong>Date:</strong> ${info.showDate}<br>
    <strong>Time:</strong> ${info.showTime}</p>
    <table style="border-collapse:collapse;width:100%;max-width:400px;">
      <thead><tr><th align="left">Seat</th><th align="left">Type</th><th align="right">Price</th></tr></thead>
      <tbody>${seatRows}</tbody>
    </table>
    <p style="margin-top:12px;">
      Subtotal: $${info.subtotal.toFixed(2)}<br>
      Tax: $${info.tax.toFixed(2)}<br>
      <strong>Total: $${info.total.toFixed(2)}</strong>
    </p>
    <p>Card charged: ${info.cardType} ending in ${info.lastFour}</p>
    <p>Show this email at the door, or look up your bookings under "Order History" in your profile.</p>`;
}

// ─── Pricing Constants ───
const TAX_RATE = 0.08;

// ═══════════════════════════════════════════════
// MOVIE ROUTES
// ═══════════════════════════════════════════════

// 2.1, 2.3, 2.4: Get all movies with optional title search and genre filter
server.get("/api/movies", async (req, res) => {
  try {
    const where = {};

    if (req.query.q) {
      where.title = { [Op.like]: `%${req.query.q}%` };
    }

    if (req.query.genre) {
      where.genre = req.query.genre;
    }

    const movies = await Movie.findAll({
      where,
      attributes: ["movie_id", "title", "genre", "rating", "status"],
    });

    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2.2: Get single movie by ID (full details for Movie Details Page)
server.get("/api/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findByPk(req.params.id);

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.get("/api/movies/:id/recommendations", async (req, res) => {
  try {
    const selectedMovie = await Movie.findByPk(req.params.id);

    if (!selectedMovie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const movies = await Movie.findAll({
      where: { movie_id: { [Op.ne]: selectedMovie.movie_id } },
      attributes: ["movie_id", "title", "genre", "rating", "status", "description"],
    });

    const user = optionalUser(req);
    let favorites = [];
    if (user) {
      favorites = await Favorite.findAll({
        where: { user_id: user.user_id },
        include: [{ model: Movie, attributes: ["title", "genre"] }],
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }

    const favoriteSummary = favorites
      .map((f) => `${f.Movie.title} (${f.Movie.genre})`)
      .join(", ") || "No favorites yet";
    const prompt = `You are a cinema recommendation assistant.
Return only valid JSON with this exact shape:
[
  {"movie_id": 1, "reason": "one short customer-friendly sentence"}
]

Customer is viewing:
${JSON.stringify({
  movie_id: selectedMovie.movie_id,
  title: selectedMovie.title,
  genre: selectedMovie.genre,
  rating: selectedMovie.rating,
  status: selectedMovie.status,
  description: selectedMovie.description,
})}

Customer favorites:
${favoriteSummary}

Available movies:
${JSON.stringify(movies.map((m) => ({
  movie_id: m.movie_id,
  title: m.title,
  genre: m.genre,
  rating: m.rating,
  status: m.status,
  description: m.description,
})))}

Recommend exactly 3 movies from Available movies.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API error:", errorText);
      return res.status(502).json({ error: "Gemini failed to generate recommendations." });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (parseErr) {
      console.error("Gemini JSON parse error:", parseErr.message);
      return res.status(502).json({ error: "Gemini returned invalid recommendations." });
    }
    const byId = new Map(movies.map((movie) => [movie.movie_id, movie]));
    const recommendations = parsed
      .map((item) => {
        const movie = byId.get(Number(item.movie_id));
        if (!movie) return null;
        return {
          movie_id: movie.movie_id,
          title: movie.title,
          genre: movie.genre,
          rating: movie.rating,
          status: movie.status,
          reason: item.reason || "Recommended by Gemini.",
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    res.json({
      source: "Gemini",
      recommendations,
    });
  } catch (err) {
    console.error("Recommendation error:", err);
    res.status(500).json({ error: "Failed to load recommendations." });
  }
});

// ═══════════════════════════════════════════════
// SPRINT 2 ROUTES
// ═══════════════════════════════════════════════

// ─── Registration ───

server.post("/api/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phone,
      promotionOptIn,
      address,
      card,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "All required fields must be filled." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Validate password strength
    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    // Check email uniqueness
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already registered." });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const user = await User.create({
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: passwordHash,
      phone: phone || null,
      promotion_opt_in: promotionOptIn ? 1 : 0,
    });

    const userId = user.user_id;

    // Insert address if provided
    if (address && address.street && address.city && address.state && address.zipCode) {
      await Address.create({
        user_id: userId,
        street: address.street,
        city: address.city,
        state: address.state,
        zip_code: address.zipCode,
      });
    }

    // Insert card if provided
    if (card && card.cardNumber && card.expiryDate && card.nameOnCard && card.cardType) {
      const lastFour = card.cardNumber.replace(/\s/g, "").slice(-4);
      const encryptedNumber = encrypt(card.cardNumber.replace(/\s/g, ""));
      await PaymentCard.create({
        user_id: userId,
        card_type: card.cardType,
        card_number_encrypted: encryptedNumber,
        last_four: lastFour,
        expiry_date: card.expiryDate,
        name_on_card: card.nameOnCard,
      });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await VerificationToken.create({
      user_id: userId,
      token,
      expires_at: expiresAt,
    });

    // Send verification email
    const verifyLink = `${process.env.BASE_URL}/verify.html?token=${token}`;
    await sendEmail(
      email,
      "Verify Your Email - Cinema E-Booking",
      verificationEmail(firstName, verifyLink)
    );

    res.status(201).json({
      message: "Registration successful! Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ─── Email Verification ───

server.get("/api/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "No token provided." });
    }

    const record = await VerificationToken.findOne({
      where: {
        token,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!record) {
      return res.status(400).json({ error: "Invalid or expired verification token." });
    }

    const userId = record.user_id;

    // Activate user
    await User.update({ status: "Active" }, { where: { user_id: userId } });

    // Delete used token
    await VerificationToken.destroy({ where: { user_id: userId } });

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Verification failed." });
  }
});

// ─── Login ───

server.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Check account status
    if (user.status === "Inactive") {
      return res.status(403).json({
        error: "Please verify your email before logging in.",
      });
    }
    if (user.status === "Suspended") {
      return res.status(403).json({
        error: "Your account has been suspended. Contact support.",
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Generate JWT
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed." });
  }
});

// ─── Forgot Password ───

server.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Always return same message (security)
    const genericMsg =
      "If an account with that email exists, a password reset link has been sent.";

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json({ message: genericMsg });
    }

    // Delete any existing reset tokens for this user
    await PasswordResetToken.destroy({ where: { user_id: user.user_id } });

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await PasswordResetToken.create({
      user_id: user.user_id,
      token,
      expires_at: expiresAt,
    });

    const resetLink = `${process.env.BASE_URL}/reset-password.html?token=${token}`;
    await sendEmail(
      email,
      "Password Reset - Cinema E-Booking",
      resetPasswordEmail(user.first_name, resetLink)
    );

    res.json({ message: genericMsg });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// ─── Reset Password ───

server.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const record = await PasswordResetToken.findOne({
      where: {
        token,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!record) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    const userId = record.user_id;
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await User.update({ password_hash: passwordHash }, { where: { user_id: userId } });

    // Delete used token
    await PasswordResetToken.destroy({ where: { user_id: userId } });

    // Send notification
    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ["first_name", "email"],
    });
    if (user) {
      await sendEmail(
        user.email,
        "Password Changed - Cinema E-Booking",
        passwordChangeEmail(user.first_name)
      );
    }

    res.json({ message: "Password reset successful! You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed." });
  }
});

// ─── Profile: Get ───

server.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.user_id },
      attributes: [
        "user_id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "promotion_opt_in",
        "role",
        "status",
      ],
      include: [
        { model: Address },
        {
          model: PaymentCard,
          attributes: ["card_id", "card_type", "last_four", "expiry_date", "name_on_card"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const plain = user.get({ plain: true });

    res.json({
      user_id: plain.user_id,
      first_name: plain.first_name,
      last_name: plain.last_name,
      email: plain.email,
      phone: plain.phone,
      promotion_opt_in: plain.promotion_opt_in,
      role: plain.role,
      status: plain.status,
      address: plain.Address || null,
      cards: plain.PaymentCards || [],
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to load profile." });
  }
});

// ─── Profile: Update Basic Info ───

server.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, promotionOptIn } = req.body;
    const userId = req.user.user_id;

    // Get current values for change detection
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const changes = [];

    const newFirst = firstName !== undefined ? firstName : user.first_name;
    const newLast = lastName !== undefined ? lastName : user.last_name;
    const newPhone = phone !== undefined ? phone : user.phone;
    const newPromo =
      promotionOptIn !== undefined ? (promotionOptIn ? 1 : 0) : user.promotion_opt_in;

    if (newFirst !== user.first_name) changes.push("First name updated");
    if (newLast !== user.last_name) changes.push("Last name updated");
    if (newPhone !== user.phone) changes.push("Phone number updated");
    if (newPromo !== user.promotion_opt_in)
      changes.push("Promotion preference updated");

    await User.update(
      {
        first_name: newFirst,
        last_name: newLast,
        phone: newPhone,
        promotion_opt_in: newPromo,
      },
      { where: { user_id: userId } }
    );

    // Send notification email for any change
    if (changes.length > 0) {
      await sendEmail(
        user.email,
        "Profile Updated - Cinema E-Booking",
        profileChangeEmail(newFirst, changes)
      );
    }

    res.json({ message: "Profile updated successfully." });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// ─── Profile: Change Password ───

server.put("/api/profile/password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.user_id;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match." });
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ["password_hash", "first_name", "email"],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await User.update({ password_hash: newHash }, { where: { user_id: userId } });

    await sendEmail(
      user.email,
      "Password Changed - Cinema E-Booking",
      passwordChangeEmail(user.first_name)
    );

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password." });
  }
});

// ─── Profile: Address (upsert) ───

server.put("/api/profile/address", authenticateToken, async (req, res) => {
  try {
    const { street, city, state, zipCode } = req.body;
    const userId = req.user.user_id;

    if (!street || !city || !state || !zipCode) {
      return res.status(400).json({ error: "All address fields are required." });
    }

    // Upsert address
    const existing = await Address.findOne({ where: { user_id: userId } });

    if (existing) {
      await Address.update(
        { street, city, state, zip_code: zipCode },
        { where: { user_id: userId } }
      );
    } else {
      await Address.create({
        user_id: userId,
        street,
        city,
        state,
        zip_code: zipCode,
      });
    }

    // Send notification
    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ["first_name", "email"],
    });
    await sendEmail(
      user.email,
      "Profile Updated - Cinema E-Booking",
      profileChangeEmail(user.first_name, [
        existing ? "Address updated" : "Address added",
      ])
    );

    res.json({ message: "Address saved successfully." });
  } catch (err) {
    console.error("Address update error:", err);
    res.status(500).json({ error: "Failed to update address." });
  }
});

// ─── Profile: Delete Address ───

server.delete("/api/profile/address", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    await Address.destroy({ where: { user_id: userId } });

    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ["first_name", "email"],
    });
    await sendEmail(
      user.email,
      "Profile Updated - Cinema E-Booking",
      profileChangeEmail(user.first_name, ["Address removed"])
    );

    res.json({ message: "Address removed successfully." });
  } catch (err) {
    console.error("Delete address error:", err);
    res.status(500).json({ error: "Failed to remove address." });
  }
});

// ─── Profile: Add Card ───

server.post("/api/profile/cards", authenticateToken, async (req, res) => {
  try {
    const { cardNumber, expiryDate, nameOnCard, cardType } = req.body;
    const userId = req.user.user_id;

    if (!cardNumber || !expiryDate || !nameOnCard || !cardType) {
      return res.status(400).json({ error: "All card fields are required." });
    }

    // Check max 3 cards
    const count = await PaymentCard.count({ where: { user_id: userId } });

    if (count >= 3) {
      return res
        .status(400)
        .json({ error: "Maximum 3 payment cards allowed." });
    }

    const cleanNumber = cardNumber.replace(/\s/g, "");
    const lastFour = cleanNumber.slice(-4);
    const encryptedNumber = encrypt(cleanNumber);

    await PaymentCard.create({
      user_id: userId,
      card_type: cardType,
      card_number_encrypted: encryptedNumber,
      last_four: lastFour,
      expiry_date: expiryDate,
      name_on_card: nameOnCard,
    });

    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ["first_name", "email"],
    });
    await sendEmail(
      user.email,
      "Profile Updated - Cinema E-Booking",
      profileChangeEmail(user.first_name, ["Payment card added"])
    );

    res.status(201).json({ message: "Card added successfully." });
  } catch (err) {
    console.error("Add card error:", err);
    res.status(500).json({ error: "Failed to add card." });
  }
});

// ─── Profile: Update Card ───

server.put("/api/profile/cards/:cardId", authenticateToken, async (req, res) => {
  try {
    const { cardNumber, expiryDate, nameOnCard, cardType } = req.body;
    const { cardId } = req.params;
    const userId = req.user.user_id;

    if (!cardNumber || !expiryDate || !nameOnCard || !cardType) {
      return res.status(400).json({ error: "All card fields are required." });
    }

    // Verify card belongs to user
    const existing = await PaymentCard.findOne({
      where: { card_id: cardId, user_id: userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Card not found." });
    }

    const cleanNumber = cardNumber.replace(/\s/g, "");
    const lastFour = cleanNumber.slice(-4);
    const encryptedNumber = encrypt(cleanNumber);

    await PaymentCard.update(
      {
        card_type: cardType,
        card_number_encrypted: encryptedNumber,
        last_four: lastFour,
        expiry_date: expiryDate,
        name_on_card: nameOnCard,
      },
      { where: { card_id: cardId, user_id: userId } }
    );

    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ["first_name", "email"],
    });
    await sendEmail(
      user.email,
      "Profile Updated - Cinema E-Booking",
      profileChangeEmail(user.first_name, ["Payment card updated"])
    );

    res.json({ message: "Card updated successfully." });
  } catch (err) {
    console.error("Update card error:", err);
    res.status(500).json({ error: "Failed to update card." });
  }
});

// ─── Profile: Delete Card ───

server.delete("/api/profile/cards/:cardId", authenticateToken, async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.user_id;

    const existing = await PaymentCard.findOne({
      where: { card_id: cardId, user_id: userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Card not found." });
    }

    await PaymentCard.destroy({ where: { card_id: cardId, user_id: userId } });

    const user = await User.findOne({
      where: { user_id: userId },
      attributes: ["first_name", "email"],
    });
    await sendEmail(
      user.email,
      "Profile Updated - Cinema E-Booking",
      profileChangeEmail(user.first_name, ["Payment card removed"])
    );

    res.json({ message: "Card removed successfully." });
  } catch (err) {
    console.error("Delete card error:", err);
    res.status(500).json({ error: "Failed to remove card." });
  }
});

// ─── Favorites ───

server.get("/api/favorites", authenticateToken, async (req, res) => {
  try {
    const favorites = await Favorite.findAll({
      where: { user_id: req.user.user_id },
      include: [
        {
          model: Movie,
          attributes: ["movie_id", "title", "genre", "rating", "status"],
        },
      ],
    });

    const rows = favorites.map((f) => {
      const movie = f.Movie.get({ plain: true });
      return movie;
    });

    res.json(rows);
  } catch (err) {
    console.error("Get favorites error:", err);
    res.status(500).json({ error: "Failed to load favorites." });
  }
});

server.get("/api/favorites/ids", authenticateToken, async (req, res) => {
  try {
    const favorites = await Favorite.findAll({
      where: { user_id: req.user.user_id },
      attributes: ["movie_id"],
    });
    res.json(favorites.map((f) => f.movie_id));
  } catch (err) {
    console.error("Get favorite ids error:", err);
    res.status(500).json({ error: "Failed to load favorites." });
  }
});

server.post("/api/favorites/:movieId", authenticateToken, async (req, res) => {
  try {
    await Favorite.findOrCreate({
      where: { user_id: req.user.user_id, movie_id: req.params.movieId },
    });
    res.status(201).json({ message: "Added to favorites." });
  } catch (err) {
    console.error("Add favorite error:", err);
    res.status(500).json({ error: "Failed to add favorite." });
  }
});

server.delete("/api/favorites/:movieId", authenticateToken, async (req, res) => {
  try {
    await Favorite.destroy({
      where: { user_id: req.user.user_id, movie_id: req.params.movieId },
    });
    res.json({ message: "Removed from favorites." });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ error: "Failed to remove favorite." });
  }
});

// ═══════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════

function requireAdmin(req, res, next) {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

// ─── Admin: Add Movie ───

server.post("/api/admin/movies", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, genre, rating, description, poster, trailer, status, release_date, director, producer, cast_members } = req.body;

    if (!title || !genre || !rating || !status) {
      return res.status(400).json({ error: "Title, genre, rating, and status are required." });
    }

    const validGenres = ["Animation", "Comedy", "Drama", "Horror", "Romance", "Action", "Sci-Fi", "Thriller"];
    if (!validGenres.includes(genre)) {
      return res.status(400).json({ error: "Invalid genre." });
    }

    const validRatings = ["G", "PG", "PG-13", "R", "NR"];
    if (!validRatings.includes(rating)) {
      return res.status(400).json({ error: "Invalid rating." });
    }

    if (!["Now Playing", "Coming Soon"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'Now Playing' or 'Coming Soon'." });
    }

    const movie = await Movie.create({
      title,
      genre,
      rating,
      description: description || null,
      poster: poster || null,
      trailer: trailer || null,
      status,
      release_date: release_date || null,
      director: director || null,
      producer: producer || null,
      cast_members: cast_members || null,
    });

    res.status(201).json({ message: "Movie added successfully.", movie });
  } catch (err) {
    console.error("Add movie error:", err);
    res.status(500).json({ error: "Failed to add movie." });
  }
});

// ─── Admin: Get Showrooms ───

server.get("/api/showrooms", async (req, res) => {
  try {
    const showrooms = await Showroom.findAll();
    res.json(showrooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Add Showtime ───

server.post("/api/admin/showtimes", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { movie_id, showroom_id, show_date, show_time } = req.body;

    if (!movie_id || !showroom_id || !show_date || !show_time) {
      return res.status(400).json({ error: "Movie, showroom, date, and time are all required." });
    }

    // Verify movie exists
    const movie = await Movie.findByPk(movie_id);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found." });
    }

    // Verify showroom exists
    const showroom = await Showroom.findByPk(showroom_id);
    if (!showroom) {
      return res.status(404).json({ error: "Showroom not found." });
    }

    // Check for scheduling conflict (same showroom, same date, same time)
    const conflict = await Showtime.findOne({
      where: {
        showroom_id,
        show_date,
        show_time,
      },
    });

    if (conflict) {
      const conflictMovie = await Movie.findByPk(conflict.movie_id, { attributes: ["title"] });
      return res.status(409).json({
        error: `Scheduling conflict: ${showroom.name} already has "${conflictMovie.title}" scheduled at that date and time.`,
      });
    }

    const showtime = await Showtime.create({ movie_id, showroom_id, show_date, show_time });

    res.status(201).json({ message: "Showtime added successfully.", showtime });
  } catch (err) {
    console.error("Add showtime error:", err);
    res.status(500).json({ error: "Failed to add showtime." });
  }
});

// ─── Admin: Get All Showtimes ───

server.get("/api/admin/showtimes", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const showtimes = await Showtime.findAll({
      include: [
        { model: Movie, attributes: ["title"] },
        { model: Showroom, attributes: ["name"] },
      ],
      order: [["show_date", "ASC"], ["show_time", "ASC"]],
    });
    res.json(showtimes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Update Showtime ───

server.put("/api/admin/showtimes/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { movie_id, showroom_id, show_date, show_time } = req.body;

    if (!movie_id || !showroom_id || !show_date || !show_time) {
      return res.status(400).json({ error: "Movie, showroom, date, and time are all required." });
    }

    const existing = await Showtime.findByPk(id);
    if (!existing) {
      return res.status(404).json({ error: "Showtime not found." });
    }

    const movie = await Movie.findByPk(movie_id);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found." });
    }
    const showroom = await Showroom.findByPk(showroom_id);
    if (!showroom) {
      return res.status(404).json({ error: "Showroom not found." });
    }

    // Check conflict against a different showtime
    const conflict = await Showtime.findOne({
      where: {
        showroom_id,
        show_date,
        show_time,
        showtime_id: { [Op.ne]: id },
      },
    });
    if (conflict) {
      const conflictMovie = await Movie.findByPk(conflict.movie_id, { attributes: ["title"] });
      return res.status(409).json({
        error: `Scheduling conflict: ${showroom.name} already has "${conflictMovie.title}" scheduled at that date and time.`,
      });
    }

    await Showtime.update(
      { movie_id, showroom_id, show_date, show_time },
      { where: { showtime_id: id } }
    );

    res.json({ message: "Showtime updated successfully." });
  } catch (err) {
    console.error("Update showtime error:", err);
    res.status(500).json({ error: "Failed to update showtime." });
  }
});

// ─── Admin: Delete Showtime ───

server.delete("/api/admin/showtimes/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Showtime.findByPk(id);
    if (!existing) {
      return res.status(404).json({ error: "Showtime not found." });
    }

    // Block delete if there are active bookings
    const activeBookings = await Booking.count({
      where: {
        showtime_id: id,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });
    if (activeBookings > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${activeBookings} active booking(s) exist for this showtime.`,
      });
    }

    await Showtime.destroy({ where: { showtime_id: id } });
    res.json({ message: "Showtime deleted successfully." });
  } catch (err) {
    console.error("Delete showtime error:", err);
    res.status(500).json({ error: "Failed to delete showtime." });
  }
});

// ─── Admin: Add Promotion (Bonus) ───

server.post("/api/admin/promotions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { code, discount_percent, start_date, end_date, description } = req.body;

    if (!code || !discount_percent || !start_date || !end_date) {
      return res.status(400).json({ error: "Code, discount, start date, and end date are required." });
    }

    if (discount_percent <= 0 || discount_percent > 100) {
      return res.status(400).json({ error: "Discount must be between 1 and 100." });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ error: "End date must be after start date." });
    }

    // Check code uniqueness
    const existing = await Promotion.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: "Promotion code already exists." });
    }

    const promo = await Promotion.create({
      code,
      discount_percent,
      start_date,
      end_date,
      description: description || null,
    });

    // Send to subscribed users
    const subscribers = await User.findAll({
      where: { promotion_opt_in: 1, status: "Active" },
      attributes: ["email", "first_name"],
    });

    if (subscribers.length > 0) {
      const emailPromises = subscribers.map((u) =>
        sendEmail(
          u.email,
          `Promotion: ${code} - Cinema E-Booking`,
          promotionEmail(u.first_name, promo)
        )
      );
      await Promise.all(emailPromises);
      await Promotion.update({ sent: true }, { where: { promotion_id: promo.promotion_id } });
    }

    res.status(201).json({
      message: `Promotion created and emailed to ${subscribers.length} subscriber(s).`,
      promotion: promo,
    });
  } catch (err) {
    console.error("Add promotion error:", err);
    res.status(500).json({ error: "Failed to add promotion." });
  }
});

// ─── Admin: Get Promotions ───

server.get("/api/admin/promotions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const promos = await Promotion.findAll({ order: [["start_date", "DESC"]] });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Send Existing Promotion ───

server.post("/api/admin/promotions/:id/send", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const promo = await Promotion.findByPk(id);
    if (!promo) {
      return res.status(404).json({ error: "Promotion not found." });
    }

    const subscribers = await User.findAll({
      where: { promotion_opt_in: 1, status: "Active" },
      attributes: ["email", "first_name"],
    });

    if (subscribers.length === 0) {
      return res.json({ message: "No subscribed users to email.", count: 0 });
    }

    const emailPromises = subscribers.map((u) =>
      sendEmail(
        u.email,
        `Promotion: ${promo.code} - Cinema E-Booking`,
        promotionEmail(u.first_name, promo)
      )
    );
    await Promise.all(emailPromises);

    if (!promo.sent) {
      await Promotion.update({ sent: true }, { where: { promotion_id: id } });
    }

    res.json({
      message: `Sent to ${subscribers.length} subscriber(s).`,
      count: subscribers.length,
    });
  } catch (err) {
    console.error("Send promotion error:", err);
    res.status(500).json({ error: "Failed to send promotion." });
  }
});

// ═══════════════════════════════════════════════
// USER BOOKING ROUTES
// ═══════════════════════════════════════════════

// ─── Get Ticket Prices ───

server.get("/api/ticket-prices", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const prices = await TicketPrice.findAll({
      where: {
        valid_from: { [Op.lte]: today },
        [Op.or]: [
          { valid_to: null },
          { valid_to: { [Op.gte]: today } },
        ],
      },
    });
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Showtimes for a Movie ───

server.get("/api/movies/:id/showtimes", async (req, res) => {
  try {
    const showtimes = await Showtime.findAll({
      where: {
        movie_id: req.params.id,
        show_date: { [Op.gte]: new Date().toISOString().split("T")[0] },
      },
      include: [{ model: Showroom, attributes: ["showroom_id", "name", "rows", "cols"] }],
      order: [["show_date", "ASC"], ["show_time", "ASC"]],
    });
    res.json(showtimes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Booked Seats for a Showtime ───

server.get("/api/showtimes/:id/seats", async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: {
        showtime_id: req.params.id,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
      include: [{ model: BookedSeat, attributes: ["seat_label"] }],
    });

    const bookedSeats = [];
    bookings.forEach((b) => {
      b.BookedSeats.forEach((s) => bookedSeats.push(s.seat_label));
    });

    res.json({ booked: bookedSeats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Create Booking (full checkout: seats + pricing + payment + email) ───

server.post("/api/bookings", authenticateToken, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { showtime_id, email, seats, payment } = req.body;
    // seats: [{ seat_label: "A1", ticket_type: "adult", price: 12.00 }, ...]
    // payment: either { card_id: 5 } for a saved card,
    //          or { cardType, cardNumber, expiryDate, nameOnCard, save? } for a new card

    if (!showtime_id || !email || !seats || seats.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: "Showtime, email, and seats are required." });
    }

    if (!payment || (!payment.card_id && !payment.cardNumber)) {
      await t.rollback();
      return res.status(400).json({ error: "Payment information is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Verify showtime exists
    const showtime = await Showtime.findByPk(showtime_id, {
      include: [
        { model: Movie, attributes: ["title"] },
        { model: Showroom, attributes: ["name"] },
      ],
    });
    if (!showtime) {
      await t.rollback();
      return res.status(404).json({ error: "Showtime not found." });
    }

    // Check for already booked seats
    const seatLabels = seats.map((s) => s.seat_label);
    const existingBookings = await Booking.findAll({
      where: {
        showtime_id,
        status: { [Op.in]: ["pending", "confirmed"] },
      },
      include: [{
        model: BookedSeat,
        where: { seat_label: { [Op.in]: seatLabels } },
        required: true,
      }],
    });

    if (existingBookings.length > 0) {
      const taken = [];
      existingBookings.forEach((b) => b.BookedSeats.forEach((s) => taken.push(s.seat_label)));
      await t.rollback();
      return res.status(409).json({ error: `Seats already booked: ${taken.join(", ")}` });
    }

    // Resolve payment card
    let cardId = null;
    let cardType = null;
    let lastFour = null;

    if (payment.card_id) {
      const savedCard = await PaymentCard.findOne({
        where: { card_id: payment.card_id, user_id: req.user.user_id },
      });
      if (!savedCard) {
        await t.rollback();
        return res.status(404).json({ error: "Saved card not found." });
      }
      cardId = savedCard.card_id;
      cardType = savedCard.card_type;
      lastFour = savedCard.last_four;
    } else {
      // New card details
      const { cardType: ct, cardNumber, expiryDate, nameOnCard, save } = payment;
      if (!ct || !cardNumber || !expiryDate || !nameOnCard) {
        await t.rollback();
        return res.status(400).json({ error: "All card fields are required." });
      }
      const cleanNumber = String(cardNumber).replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(cleanNumber)) {
        await t.rollback();
        return res.status(400).json({ error: "Invalid card number." });
      }
      cardType = ct;
      lastFour = cleanNumber.slice(-4);

      if (save) {
        const count = await PaymentCard.count({ where: { user_id: req.user.user_id } });
        if (count < 3) {
          const newCard = await PaymentCard.create(
            {
              user_id: req.user.user_id,
              card_type: ct,
              card_number_encrypted: encrypt(cleanNumber),
              last_four: lastFour,
              expiry_date: expiryDate,
              name_on_card: nameOnCard,
            },
            { transaction: t }
          );
          cardId = newCard.card_id;
        }
      }
    }

    // Calculate totals
    const subtotal = seats.reduce((sum, s) => sum + Number(s.price), 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // Create booking (confirmed since payment succeeds in this mock)
    const booking = await Booking.create(
      {
        user_id: req.user.user_id,
        showtime_id,
        email,
        status: "confirmed",
      },
      { transaction: t }
    );

    // Create booked seats
    const seatRecords = seats.map((s) => ({
      booking_id: booking.booking_id,
      seat_label: s.seat_label,
      ticket_type: s.ticket_type,
      price: s.price,
    }));
    await BookedSeat.bulkCreate(seatRecords, { transaction: t });

    // Create order
    const order = await Order.create(
      {
        user_id: req.user.user_id,
        booking_id: booking.booking_id,
        promotion_id: null,
        subtotal,
        discount_amount: 0,
        tax_amount: tax,
        total,
        status: "completed",
      },
      { transaction: t }
    );

    // Create payment
    await Payment.create(
      {
        order_id: order.order_id,
        card_id: cardId,
        amount: total,
        status: "completed",
        transaction_ref: `TXN-${Date.now()}-${booking.booking_id}`,
      },
      { transaction: t }
    );

    await t.commit();

    // Send confirmation email (after commit so we don't block)
    const user = await User.findOne({
      where: { user_id: req.user.user_id },
      attributes: ["first_name"],
    });
    const [h, m] = showtime.show_time.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 || 12;
    const showTimeStr = `${hr12}:${m} ${ampm}`;
    const showDateStr = new Date(showtime.show_date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });

    sendEmail(
      email,
      `Booking Confirmation #${booking.booking_id} - Cinema E-Booking`,
      orderConfirmationEmail(user ? user.first_name : "there", {
        bookingId: booking.booking_id,
        movieTitle: showtime.Movie.title,
        showroomName: showtime.Showroom.name,
        showDate: showDateStr,
        showTime: showTimeStr,
        seats,
        subtotal,
        tax,
        total,
        cardType,
        lastFour,
      })
    );

    res.status(201).json({
      message: "Booking confirmed.",
      booking_id: booking.booking_id,
      order_id: order.order_id,
      subtotal,
      tax,
      total,
    });
  } catch (err) {
    try { await t.rollback(); } catch {}
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Failed to create booking." });
  }
});

// ─── Order History ───

server.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { user_id: req.user.user_id },
      order: [["order_date", "DESC"]],
      include: [
        {
          model: Booking,
          include: [
            { model: BookedSeat },
            {
              model: Showtime,
              include: [
                { model: Movie, attributes: ["movie_id", "title", "poster"] },
                { model: Showroom, attributes: ["name"] },
              ],
            },
          ],
        },
        {
          model: Payment,
          attributes: ["payment_id", "amount", "status", "transaction_ref", "payment_date"],
          include: [{ model: PaymentCard, attributes: ["card_type", "last_four"] }],
        },
      ],
    });

    const result = orders.map((o) => {
      const plain = o.get({ plain: true });
      const booking = plain.Booking || {};
      const showtime = booking.Showtime || {};
      const movie = showtime.Movie || {};
      const showroom = showtime.Showroom || {};
      const payment = (plain.Payments && plain.Payments[0]) || null;
      return {
        order_id: plain.order_id,
        order_date: plain.order_date,
        subtotal: Number(plain.subtotal),
        tax_amount: Number(plain.tax_amount),
        total: Number(plain.total),
        status: plain.status,
        booking_id: booking.booking_id,
        booking_status: booking.status,
        movie: { movie_id: movie.movie_id, title: movie.title, poster: movie.poster },
        showroom_name: showroom.name,
        show_date: showtime.show_date,
        show_time: showtime.show_time,
        seats: (booking.BookedSeats || []).map((s) => ({
          seat_label: s.seat_label,
          ticket_type: s.ticket_type,
          price: Number(s.price),
        })),
        payment: payment
          ? {
              status: payment.status,
              amount: Number(payment.amount),
              transaction_ref: payment.transaction_ref,
              card_type: payment.PaymentCard ? payment.PaymentCard.card_type : null,
              last_four: payment.PaymentCard ? payment.PaymentCard.last_four : null,
            }
          : null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Failed to load order history." });
  }
});

// ═══════════════════════════════════════════════

const PORT = 3000;
sequelize.sync({ alter: true }).then(() => {
  console.log("Database synced");
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
