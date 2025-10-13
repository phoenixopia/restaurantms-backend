// models/Favorite.js
module.exports = (sequelize, DataTypes) => {
  const Favorite = sequelize.define("Favorite", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    targetType: {
      type: DataTypes.ENUM("menu", "restaurant"),
      allowNull: false,
    },
    is_favorite: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
  });

  Favorite.associate = (models) => {
    Favorite.belongsTo(models.Customer, { foreignKey: "customer_id" });
    Favorite.belongsTo(models.Restaurant, {
      foreignKey: "targetId",
      constraints: false,
    });
    Favorite.belongsTo(models.Menu, {
      foreignKey: "targetId",
      constraints: false,
    });
  };

  return Favorite;
};
