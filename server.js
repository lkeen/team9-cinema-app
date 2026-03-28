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
  Favorite,
  VerificationToken,
  PasswordResetToken,
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

const PORT = 3000;
sequelize.sync({ alter: true }).then(() => {
  console.log("Database synced");
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
