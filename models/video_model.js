"use strict";

module.exports = (sequelize, DataTypes) => {
  const Video = sequelize.define(
    "Video",
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

      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },

      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      video_url: {
        type: DataTypes.STRING(2048),
        allowNull: false,
      },

      thumbnail_url: {
        type: DataTypes.STRING(2048),
        allowNull: false,
      },

      menu_item_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "menu_items",
          key: "id",
        },
      },

      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },

      is_featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "videos",
      timestamps: true,
      underscored: true,
    }
  );

  Video.associate = (models) => {
    Video.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    Video.belongsTo(models.Branch, {
      foreignKey: "branch_id",
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    Video.belongsTo(models.User, {
      foreignKey: "uploaded_by",
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    Video.belongsTo(models.MenuItem, {
      foreignKey: "menu_item_id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    Video.hasMany(models.VideoView, {
      foreignKey: "video_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    Video.hasMany(models.VideoComment, {
      foreignKey: "video_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    Video.hasMany(models.VideoLike, {
      foreignKey: "video_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    Video.hasMany(models.VideoFavorite, {
      foreignKey: "video_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return Video;
};
