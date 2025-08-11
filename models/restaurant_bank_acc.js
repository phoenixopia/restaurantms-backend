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
      branch_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "branches",
          key: "id",
        },
      },
      bank_name: {
        type: DataTypes.ENUM(
          "Commercial Bank of Ethiopia",
          "Awash International Bank",
          "Dashen Bank",
          "Bank of Abyssinia",
          "Cooperative Bank of Oromia",
          "Berhan International Bank",
          "Nib International Bank",
          "Hibret Bank",
          "Bunna International Bank",
          "Wegagen Bank",
          "Abay Bank",
          "Zemen Bank",
          "Oromia International Bank",
          "Enat Bank",
          "Hijra Bank",
          "Siinqee Bank",
          "Ahadu Bank",
          "Tsehay Bank"
        ),
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
    RestaurantBankAccount.belongsTo(models.Branch, {
      foreignKey: "branch_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return RestaurantBankAccount;
};
