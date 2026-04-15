const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Booking = sequelize.define(
    "Booking",
    {
      booking_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      showtime_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "bookings",
      timestamps: false,
    }
  );

  return Booking;
};
