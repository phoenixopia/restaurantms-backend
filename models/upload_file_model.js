"use strict";

module.exports = (sequelize, DataTypes) => {
  const UploadedFile = sequelize.define(
    "UploadedFile",
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

      path: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      size_mb: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },

      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },

      type: {
        type: DataTypes.ENUM(
          "restaurant",
          "menu-item",
          "gallery",
          "video",
          "catering-card",
          "video-thumbnail"
        ),
        allowNull: false,
      },

      reference_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: "uploaded_files",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
    }
  );

  UploadedFile.associate = (models) => {
    UploadedFile.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
    UploadedFile.belongsTo(models.User, {
      foreignKey: "uploaded_by",
    });
  };

  return UploadedFile;
};
