const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TicketPrice = sequelize.define(
    "TicketPrice",
    {
      price_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ticket_type: {
        type: DataTypes.ENUM("adult", "child", "senior"),
        allowNull: false,
      },
      base_price: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
      },
      valid_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      valid_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      tableName: "ticket_prices",
      timestamps: false,
    }
  );

  return TicketPrice;
};
