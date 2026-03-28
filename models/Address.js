const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Address = sequelize.define(
    "Address",
    {
      address_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      street: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      zip_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
    },
    {
      tableName: "addresses",
      timestamps: false,
    }
  );

  return Address;
};
