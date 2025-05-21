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
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
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
      reservation_time: DataTypes.DATE,
      guest_count: DataTypes.INTEGER,
      status: DataTypes.ENUM("Pending", "Confirmed", "Cancelled", "Completed"),
    },
    {
      tableName: "reservations",
      timestamps: true,
      underscored: true,
    }
  );

  Reservation.associate = (models) => {
    Reservation.belongsTo(models.Restaurant, { foreignKey: "restaurant_id" });
    Reservation.belongsTo(models.User, { foreignKey: "customer_id" });
    Reservation.belongsTo(models.Table, { foreignKey: "table_id" });
  };

  return Reservation;
};
