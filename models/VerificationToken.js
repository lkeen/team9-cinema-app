const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const VerificationToken = sequelize.define(
    "VerificationToken",
    {
      token_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "verification_tokens",
      timestamps: false,
    }
  );

  return VerificationToken;
};
