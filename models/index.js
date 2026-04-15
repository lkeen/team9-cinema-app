const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
  }
);

// Import models
const User = require("./User")(sequelize);
const Address = require("./Address")(sequelize);
const PaymentCard = require("./PaymentCard")(sequelize);
const Movie = require("./Movie")(sequelize);
const Showtime = require("./Showtime")(sequelize);
const Showroom = require("./Showroom")(sequelize);
const Favorite = require("./Favorite")(sequelize);
const VerificationToken = require("./VerificationToken")(sequelize);
const PasswordResetToken = require("./PasswordResetToken")(sequelize);
const Booking = require("./Booking")(sequelize);
const BookedSeat = require("./BookedSeat")(sequelize);
const Promotion = require("./Promotion")(sequelize);
const TicketPrice = require("./TicketPrice")(sequelize);
const Order = require("./Order")(sequelize);
const Payment = require("./Payment")(sequelize);

// Associations
User.hasOne(Address, { foreignKey: "user_id", onDelete: "CASCADE" });
Address.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(PaymentCard, { foreignKey: "user_id", onDelete: "CASCADE" });
PaymentCard.belongsTo(User, { foreignKey: "user_id" });

User.belongsToMany(Movie, { through: Favorite, foreignKey: "user_id", otherKey: "movie_id" });
Movie.belongsToMany(User, { through: Favorite, foreignKey: "movie_id", otherKey: "user_id" });

User.hasMany(Favorite, { foreignKey: "user_id" });
Movie.hasMany(Favorite, { foreignKey: "movie_id" });
Favorite.belongsTo(User, { foreignKey: "user_id" });
Favorite.belongsTo(Movie, { foreignKey: "movie_id" });

Movie.hasMany(Showtime, { foreignKey: "movie_id", onDelete: "CASCADE" });
Showtime.belongsTo(Movie, { foreignKey: "movie_id" });

Showroom.hasMany(Showtime, { foreignKey: "showroom_id", onDelete: "CASCADE" });
Showtime.belongsTo(Showroom, { foreignKey: "showroom_id" });

User.hasMany(Booking, { foreignKey: "user_id", onDelete: "CASCADE" });
Booking.belongsTo(User, { foreignKey: "user_id" });

Showtime.hasMany(Booking, { foreignKey: "showtime_id", onDelete: "CASCADE" });
Booking.belongsTo(Showtime, { foreignKey: "showtime_id" });

Booking.hasMany(BookedSeat, { foreignKey: "booking_id", onDelete: "CASCADE" });
BookedSeat.belongsTo(Booking, { foreignKey: "booking_id" });

User.hasMany(Order, { foreignKey: "user_id", onDelete: "CASCADE" });
Order.belongsTo(User, { foreignKey: "user_id" });

Booking.hasOne(Order, { foreignKey: "booking_id", onDelete: "CASCADE" });
Order.belongsTo(Booking, { foreignKey: "booking_id" });

Promotion.hasMany(Order, { foreignKey: "promotion_id" });
Order.belongsTo(Promotion, { foreignKey: "promotion_id" });

Order.hasMany(Payment, { foreignKey: "order_id", onDelete: "CASCADE" });
Payment.belongsTo(Order, { foreignKey: "order_id" });

PaymentCard.hasMany(Payment, { foreignKey: "card_id" });
Payment.belongsTo(PaymentCard, { foreignKey: "card_id" });

User.hasMany(VerificationToken, { foreignKey: "user_id", onDelete: "CASCADE" });
VerificationToken.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(PasswordResetToken, { foreignKey: "user_id", onDelete: "CASCADE" });
PasswordResetToken.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
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
};
