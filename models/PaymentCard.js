const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PaymentCard = sequelize.define(
    "PaymentCard",
    {
      card_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      card_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      card_number_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      last_four: {
        type: DataTypes.CHAR(4),
        allowNull: false,
      },
      expiry_date: {
        type: DataTypes.STRING(7),
        allowNull: false,
      },
      name_on_card: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      tableName: "payment_cards",
      timestamps: false,
    }
  );

  return PaymentCard;
};
