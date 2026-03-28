const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Movie = sequelize.define(
    "Movie",
    {
      movie_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      genre: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      rating: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      cast_members: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      director: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      producer: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      poster: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      trailer: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("Now Playing", "Coming Soon"),
        allowNull: true,
      },
      release_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      tableName: "movies",
      timestamps: false,
    }
  );

  return Movie;
};
