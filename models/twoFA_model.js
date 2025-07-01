"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const TwoFA = sequelize.define(
    "TwoFA",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
    },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      secret_key: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      qrCode_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "two_fa",
      underscored: true,
      timestamps: true,
    }
  );

  TwoFA.associate = function (models) {
    TwoFA.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      // onDelete: "CASCADE",
    });
  };

  return TwoFA;
};
