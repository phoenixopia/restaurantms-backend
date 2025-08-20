"use strict";
const { Op } = require("sequelize");
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
    });
    RestaurantBankAccount.belongsTo(models.Branch, {
      foreignKey: "branch_id",
    });
  };

  RestaurantBankAccount.addHook("beforeSave", async (account, options) => {
    const where = {
      restaurant_id: account.restaurant_id,
    };

    if (account.branch_id) {
      where.branch_id = account.branch_id;
    } else {
      where.branch_id = null;
    }

    const existingDefault = await RestaurantBankAccount.findOne({
      where: { ...where, is_default: true },
      transaction: options.transaction,
    });

    if (account.is_default) {
      if (
        existingDefault &&
        (!account.id || existingDefault.id !== account.id)
      ) {
        throw new Error(
          `Only one default account is allowed for ${
            account.branch_id ? "this branch" : "the restaurant"
          }.`
        );
      }
    } else {
      if (!existingDefault) {
        account.is_default = true;
      }
    }
  });

  return RestaurantBankAccount;
};
