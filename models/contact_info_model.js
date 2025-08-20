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
        references: {
          model: "restaurants",
          key: "id",
        },
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

    // ContactInfo.belongsTo(models.Restaurant, {
    //   foreignKey: "module_id",
    //   constraints: false,
    //   scope: {
    //     module_type: "restaurant",
    //   },
    // });

    // ContactInfo.belongsTo(models.Branch, {
    //   foreignKey: "module_id",
    //   constraints: false,
    //   scope: {
    //     module_type: "branch",
    //   },
    // });
  };

  return ContactInfo;
};
