const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BookedSeat = sequelize.define(
    "BookedSeat",
    {
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      seat_label: {
        type: DataTypes.STRING(5),
        allowNull: false,
        primaryKey: true,
      },
      ticket_type: {
        type: DataTypes.ENUM("adult", "child", "senior"),
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
      },
    },
    {
      tableName: "booked_seats",
      timestamps: false,
    }
  );

  return BookedSeat;
};
