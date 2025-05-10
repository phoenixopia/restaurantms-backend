"use strict";
module.exports = (sequelize, DataTypes) => {
  const SystemSetting = sequelize.define(
    "SystemSetting",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      restaurant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
      },
      default_theme: DataTypes.ENUM("Light", "Dark"),
      default_language: DataTypes.STRING(10),
      recaptcha_key: DataTypes.STRING(255),
      email_smtp_settings: DataTypes.JSON,
      primary_color: DataTypes.STRING(20),
      font_family: DataTypes.STRING(100),
      sms_enabled: DataTypes.BOOLEAN,
    },
    {
      tableName: "system_settings",
      timestamps: true,
      underscored: true,
    }
  );

  SystemSetting.associate = (models) => {
    SystemSetting.belongsTo(models.Restaurant, { foreignKey: "restaurant_id" });
  };

  return SystemSetting;
};
