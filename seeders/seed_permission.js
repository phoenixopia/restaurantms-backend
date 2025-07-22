const { Permission } = require("../models");

module.exports = async () => {
  const permissions = await Permission.bulkCreate([
    { name: "manage_users", description: "Can manage users" },
    { name: "manage_roles", description: "Can manage roles" },
    { name: "manage_permissions", description: "Can manage permissions" },
    { name: "assign_permissions", description: "Can assign permissions" },
    {
      name: "manage_restaurant",
      description: "Can manage restaurant settings",
    },
    { name: "view_branch", description: "Can view branches" },
    { name: "manage_branches", description: "Can manage branches" },
    { name: "manage_subscription", description: "Can manage subscription" },
    { name: "view_menu", description: "Can view menu" },
    { name: "create_menu", description: "Can create menu" },
    { name: "edit_menu", description: "Can edit menu" },
    { name: "delete_menu", description: "Can delete menu" },
    {
      name: "toggle_menu_activation",
      description: "Can toggle menu activation",
    },
    { name: "view_menu_category", description: "Can view menu categories" },
    { name: "create_menu_category", description: "Can create menu categories" },
    { name: "edit_menu_category", description: "Can edit menu categories" },
    { name: "delete_menu_category", description: "Can delete menu categories" },
    {
      name: "toggle_menu_category_activation",
      description: "Can toggle menu category activation",
    },
    { name: "view_menu_item", description: "Can view menu items" },
    { name: "create_menu_item", description: "Can create menu items" },
    { name: "edit_menu_item", description: "Can edit menu items" },
    { name: "delete_menu_item", description: "Can delete menu items" },
    {
      name: "toggle_menu_item_activation",
      description: "Can toggle menu item activation",
    },
    {
      name: "upload_video",
      description: "Can upload video"
    },
  ]);
  console.log("✅ Permissions seeded");
  return permissions;
};
