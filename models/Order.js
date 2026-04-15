const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Order = sequelize.define(
    "Order",
    {
      order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      promotion_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      subtotal: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
      },
      discount_amount: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
      },
      order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "cancelled", "refunded"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "orders",
      timestamps: false,
    }
  );

  return Order;
};
