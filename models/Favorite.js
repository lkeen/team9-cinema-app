const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Favorite = sequelize.define(
    "Favorite",
    {
      favorite_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      movie_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "favorites",
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "movie_id"],
        },
      ],
    }
  );

  return Favorite;
};
