const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Favorite = sequelize.define(
    "Favorite",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      movie_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
    },
    {
      tableName: "favorites",
      timestamps: false,
    }
  );

  return Favorite;
};
