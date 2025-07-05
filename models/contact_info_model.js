"use strict";
module.exports = (sequelize, DataTypes) => {
  const ContactInfo = sequelize.define(
    "ContactInfo",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      module_type: {
        type: DataTypes.ENUM("branch", "restaurant"),
        allowNull: false,
      },
      module_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      value: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "contact_info",
      underscored: true,
      timestamps: true,
    }
  );

  ContactInfo.associate = (models) => {
    ContactInfo.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return ContactInfo;
};
