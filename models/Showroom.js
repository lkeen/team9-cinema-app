const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Showroom = sequelize.define(
    "Showroom",
    {
      showroom_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 80,
      },
      rows: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 8,
      },
      cols: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
    },
    {
      tableName: "showrooms",
      timestamps: false,
    }
  );

  return Showroom;
};
