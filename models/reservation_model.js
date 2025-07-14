"use strict";

module.exports = (sequelize, DataTypes) => {
  const Reservation = sequelize.define(
    "Reservation",
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
        allowNull: false,
        references: {
          model: "branches",
          key: "id",
        },
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
      },
      table_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "tables",
          key: "id",
        },
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      guest_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "reservations",
      timestamps: true,
      underscored: true,
    }
  );

  Reservation.associate = (models) => {
    Reservation.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
    Reservation.belongsTo(models.Branch, {
      foreignKey: "branch_id",
    });
    Reservation.belongsTo(models.Customer, {
      foreignKey: "customer_id",
    });
    Reservation.belongsTo(models.Table, {
      foreignKey: "table_id",
    });
  };

  return Reservation;
};
