"use strict";

module.exports = (sequelize, DataTypes) => {
  const RestaurantBankAccount = sequelize.define(
    "RestaurantBankAccount",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      bank_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      account_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      account_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "restaurant_bank_accounts",
      timestamps: true,
      underscored: true,
    }
  );

  RestaurantBankAccount.associate = (models) => {
    RestaurantBankAccount.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return RestaurantBankAccount;
};
