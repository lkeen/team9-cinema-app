const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Payment = sequelize.define(
    "Payment",
    {
      payment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      card_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: false,
      },
      payment_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
        allowNull: false,
        defaultValue: "pending",
      },
      transaction_ref: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "payments",
      timestamps: false,
    }
  );

  return Payment;
};
