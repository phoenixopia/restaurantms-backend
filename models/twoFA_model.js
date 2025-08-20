"use strict";

module.exports = (sequelize, DataTypes) => {
  const TwoFA = sequelize.define(
    "TwoFA",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
      },

      secret_key: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      qrCode_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "two_fa",
      underscored: true,
      timestamps: true,
    }
  );

  TwoFA.associate = function (models) {
    TwoFA.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return TwoFA;
};
