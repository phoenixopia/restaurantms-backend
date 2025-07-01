"use strict";

const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const StaffSchedule = sequelize.define(
    "StaffSchedule",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      staff_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      shift_start: DataTypes.DATE,
      shift_end: DataTypes.DATE,
    },
    {
      tableName: "staff_schedules",
      timestamps: true,
      underscored: true,
    }
  );

  StaffSchedule.associate = (models) => {
    StaffSchedule.belongsTo(models.User, { foreignKey: "staff_id", as: "staff" });
  };

  return StaffSchedule;
};
