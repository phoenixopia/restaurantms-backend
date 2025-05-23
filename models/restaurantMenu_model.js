// "use strict";
// module.exports = (sequelize, DataTypes) => {
//   const RestaurantMenu = sequelize.define(
//     "RestaurantMenu",
//     {
//       id: {
//         type: DataTypes.UUID,
//         defaultValue: DataTypes.UUIDV4,
//         primaryKey: true,
//       },
//       restaurant_id: {
//         type: DataTypes.UUID,
//         allowNull: false,
//         references: {
//           model: "restaurants",
//         },
//       },
//       menu_id: {
//         type: DataTypes.UUID,
//         allowNull: false,
//         references: {
//           model: "menus",
//           key: "id",
//         },
//       },
//     },
//     {
//       tableName: "restaurant_menus",
//       timestamps: true,
//       underscored: true,
//       createdAt: "created_at",
//       updatedAt: "updated_at",
//     }
//   );

//   RestaurantMenuMenu.associate = (models) => {
//     RestaurantMenu.belongsTo(models.Restaurant, {
//       foreignKey: "tenant_id",
//       as: "restaurant",
//     });
//     RestaurantMenu.belongsTo(models.Menu, {
//       foreignKey: "menu_id",
//       as: "menu",
//     });
//   };

//   return RestaurantMenu;
// };
