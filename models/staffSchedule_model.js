"use strict";
module.exports = (sequelize, DataTypes) => {
  const StaffSchedule = sequelize.define(
    "StaffSchedule",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      staff_id: {
        type: DataTypes.UUID,
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
    StaffSchedule.belongsTo(models.User, { foreignKey: "staff_id" });
  };

  return StaffSchedule;
};
