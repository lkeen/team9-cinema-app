const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Showtime = sequelize.define(
    "Showtime",
    {
      showtime_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      movie_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      show_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      show_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
    },
    {
      tableName: "showtimes",
      timestamps: false,
    }
  );

  return Showtime;
};
