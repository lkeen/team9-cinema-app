const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Promotion = sequelize.define(
    "Promotion",
    {
      promotion_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      discount_percent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "promotions",
      timestamps: false,
    }
  );

  return Promotion;
};
