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
const Favorite = require("./Favorite")(sequelize);
const VerificationToken = require("./VerificationToken")(sequelize);
const PasswordResetToken = require("./PasswordResetToken")(sequelize);

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
  Favorite,
  VerificationToken,
  PasswordResetToken,
};
