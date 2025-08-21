"use strict";

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const now = new Date();

module.exports = async () => {
  const {
    User,
    Role,
    Permission,
    RoleTag,
    RolePermission,
    Restaurant,
    Branch,
    Location,
  } = require("../models");

  // Create role tags
  const roleTags = await RoleTag.bulkCreate([
    {
      name: "super_admin",
      description: "System super administrator with all permissions",
    },
    {
      name: "restaurant_admin",
      description: "Administrator for a specific restaurant",
    },
    { name: "staff", description: "Staff member of a restaurant" },
    { name: "customer", description: "Regular customer user" },
    { name: "other", description: "Other type of user" },
  ]);

  const superAdminRoleTag = roleTags.find((tag) => tag.name === "super_admin");
  const restaurantAdminRoleTag = roleTags.find(
    (tag) => tag.name === "restaurant_admin"
  );
  const staffRoleTag = roleTags.find((tag) => tag.name === "staff");

  // Create temp user for super admin creation
  const tempUser = await User.create({
    id: uuidv4(),
    first_name: "Temp",
    last_name: "User",
    email: "tempuser@example.com",
    password: await bcrypt.hash("tempPass123", 10),
    role_id: null,
    role_tag_id: superAdminRoleTag.id,
    is_active: true,
    email_verified_at: now,
    password_changed_at: now,
  });

  // Create super admin role
  const superAdminRole = await Role.create({
    id: uuidv4(),
    name: "Super Administrator",
    role_tag_id: superAdminRoleTag.id,
    description: "System super administrator with all permissions",
    created_by: tempUser.id,
  });

  // Create all permissions
  const permissions = await Permission.bulkCreate([
    // RBAC Permissions
    {
      name: "create_role_tag",
      description: "Permission to create new role tags",
    },
    {
      name: "update_role_tag",
      description: "Permission to update existing role tags",
    },
    { name: "view_role_tag", description: "Permission to view role tags" },
    { name: "delete_role_tag", description: "Permission to delete role tags" },
    { name: "create_role", description: "Permission to create new roles" },
    { name: "update_role", description: "Permission to update existing roles" },
    { name: "view_role", description: "Permission to view roles" },
    { name: "delete_role", description: "Permission to delete roles" },
    {
      name: "create_permission",
      description: "Permission to create new permissions",
    },
    {
      name: "update_permission",
      description: "Permission to update existing permissions",
    },
    { name: "view_permission", description: "Permission to view permissions" },

    {
      name: "view_restaurant",
      description: "Permission to view restaurant information",
    },
    {
      name: "update_restaurant",
      description: "Permission to update restaurant information",
    },

    // Contact Info Permissions
    {
      name: "add_contact_info",
      description: "Permission to add contact information",
    },
    {
      name: "view_contact_info",
      description: "Permission to view contact information",
    },
    {
      name: "update_contact_info",
      description: "Permission to update contact information",
    },
    {
      name: "delete_contact_info",
      description: "Permission to delete contact information",
    },

    // Branch Permissions
    { name: "create_branch", description: "Permission to create new branches" },
    {
      name: "update_branch",
      description: "Permission to update existing branches",
    },
    {
      name: "toggle_branch_status",
      description: "Permission to toggle branch status",
    },
    { name: "view_branch", description: "Permission to view branches" },
    { name: "delete_branch", description: "Permission to delete branches" },

    // Bank Account Permissions
    {
      name: "add_bank_account",
      description: "Permission to add bank accounts",
    },
    {
      name: "update_bank_account",
      description: "Permission to update bank accounts",
    },
    {
      name: "view_bank_account",
      description: "Permission to view bank accounts",
    },
    {
      name: "delete_bank_account",
      description: "Permission to delete bank accounts",
    },

    // Charge Setting Permissions
    {
      name: "view_charge_setting",
      description: "Permission to view charge settings",
    },
    {
      name: "manage_charge_setting",
      description: "Permission to create and update charge settings",
    },
    {
      name: "delete_charge_setting",
      description: "Permission to delete charge settings",
    },

    // Menu Permissions
    { name: "view_menu", description: "Permission to view menus" },
    { name: "edit_menu", description: "Permission to edit menus" },
    { name: "delete_menu", description: "Permission to delete menus" },
    {
      name: "view_menu_category",
      description: "Permission to view menu categories",
    },
    {
      name: "create_menu_category",
      description: "Permission to create menu categories",
    },
    {
      name: "edit_menu_category",
      description: "Permission to edit menu categories",
    },
    {
      name: "delete_menu_category",
      description: "Permission to delete menu categories",
    },
    {
      name: "toggle_menu_category_activation",
      description: "Permission to toggle menu category activation",
    },
    {
      name: "create_menu_item",
      description: "Permission to create menu items",
    },
    {
      name: "update_menu_item",
      description: "Permission to update menu items",
    },
    {
      name: "delete_menu_item",
      description: "Permission to delete menu items",
    },
    {
      name: "toggle_seasonal",
      description: "Permission to toggle seasonal status of menu items",
    },
    {
      name: "toggle_menu_item_activation",
      description: "Permission to toggle menu item activation",
    },
    { name: "view_menu_item", description: "Permission to view menu items" },

    // Order Permissions
    { name: "view_order", description: "Permission to view orders" },
    {
      name: "change_order_status",
      description: "Permission to change order status",
    },
    // {
    //   name: "create_catering",
    //   description: "Permission to create catering services",
    // },
    // {
    //   name: "update_catering",
    //   description: "Permission to update catering services",
    // },
    // {
    //   name: "delete_catering",
    //   description: "Permission to delete catering services",
    // },
    // {
    //   name: "view_catering",
    //   description: "Permission to view catering services",
    // },
    // {
    //   name: "view_catering_request",
    //   description: "Permission to view catering requests",
    // },
    // {
    //   name: "manage_catering",
    //   description: "Permission to manage catering operations",
    // },
    // {
    //   name: "prepare_catering_quote",
    //   description: "Permission to prepare catering quotes",
    // },
    // {
    //   name: "update_catering_quote",
    //   description: "Permission to update catering quotes",
    // },
    // {
    //   name: "view_catering_quote",
    //   description: "Permission to view catering quotes",
    // },
    // {
    //   name: "create_menu",
    //   description: "Permission to create menus",
    // },
    // {
    //   name: "create_branch",
    //   description: "Permission to create new branches",
    // },
    // {
    //   name: "manage_social_media",
    //   description: "Permission to manage social media/videos",
    // },
    // {
    //   name: "edit_video",
    //   description: "Permission to edit videos",
    // },
    // {
    //   name: "delete_video",
    //   description: "Permission to delete videos",
    // },
  ]);

  // Assign ALL permissions to super admin role
  await RolePermission.bulkCreate(
    permissions.map((permission) => ({
      id: uuidv4(),
      role_id: superAdminRole.id,
      permission_id: permission.id,
    }))
  );

  // Create super admin user with properly hashed password
  const superAdminUser = await User.create({
    id: uuidv4(),
    first_name: "Super",
    last_name: "Admin",
    email: "natikeleme1@gmail.com",
    password: "12345678", // Properly hashed password
    role_id: superAdminRole.id,
    role_tag_id: superAdminRoleTag.id,
    is_active: true,
    email_verified_at: now,
    password_changed_at: now,
  });

  await superAdminRole.update({ created_by: superAdminUser.id });

  // Create a restaurant
  const restaurant = await Restaurant.create({
    id: uuidv4(),
    restaurant_name: "Sample Restaurant",
    status: "active",
  });

  // Create restaurant admin role
  const restaurantAdminRole = await Role.create({
    id: uuidv4(),
    name: "Restaurant Administrator",
    role_tag_id: restaurantAdminRoleTag.id,
    restaurant_id: restaurant.id,
    description: "Administrator role for a restaurant with full permissions",
    created_by: superAdminUser.id,
  });

  // Define permissions for restaurant admin (all except super admin specific permissions)
  const restaurantAdminPermissions = [
    "create_role",
    "view_role",
    "update_role",
    "delete_role",
    "view_restaurant",
    "update_restaurant",
    "add_contact_info",
    "view_contact_info",
    "update_contact_info",
    "delete_contact_info",
    "create_branch",
    "update_branch",
    "toggle_branch_status",
    "view_branch",
    "delete_branch",
    "add_bank_account",
    "update_bank_account",
    "view_bank_account",
    "delete_bank_account",
    "view_charge_setting",
    "manage_charge_setting",
    "delete_charge_setting",
    "view_menu",
    "edit_menu",
    "delete_menu",
    "view_menu_category",
    "create_menu_category",
    "edit_menu_category",
    "delete_menu_category",
    "toggle_menu_category_activation",
    "create_menu_item",
    "update_menu_item",
    "delete_menu_item",
    "toggle_seasonal",
    "toggle_menu_item_activation",
    "view_menu_item",
    "view_order",
    "change_order_status",
  ];

  // Get permission IDs for restaurant admin
  const restaurantAdminPermissionIds = permissions
    .filter((p) => restaurantAdminPermissions.includes(p.name))
    .map((p) => p.id);

  // Assign permissions to restaurant admin role
  await RolePermission.bulkCreate(
    restaurantAdminPermissionIds.map((permissionId) => ({
      id: uuidv4(),
      role_id: restaurantAdminRole.id,
      permission_id: permissionId,
    }))
  );

  // Create restaurant admin user with properly hashed password
  const restaurantAdminUser = await User.create({
    id: uuidv4(),
    first_name: "Restaurant",
    last_name: "Admin",
    email: "restaurant1@gmail.com",
    password: "12345678",
    role_id: restaurantAdminRole.id,
    role_tag_id: restaurantAdminRoleTag.id,
    restaurant_id: restaurant.id,
    is_active: true,
    email_verified_at: now,
    password_changed_at: now,
    created_by: superAdminUser.id,
  });

  // Create staff role for the restaurant
  const staffRole = await Role.create({
    id: uuidv4(),
    name: "Restaurant Staff",
    role_tag_id: staffRoleTag.id,
    restaurant_id: restaurant.id,
    description: "Staff member with limited permissions",
    created_by: restaurantAdminUser.id,
  });

  // Define permissions for staff (basic permissions needed for daily operations)
  const staffPermissions = [
    "view_menu",
    "view_menu_category",
    "view_menu_item",
    "view_order",
    "change_order_status",
  ];

  // Get permission IDs for staff
  const staffPermissionIds = permissions
    .filter((p) => staffPermissions.includes(p.name))
    .map((p) => p.id);

  // Assign permissions to staff role
  await RolePermission.bulkCreate(
    staffPermissionIds.map((permissionId) => ({
      id: uuidv4(),
      role_id: staffRole.id,
      permission_id: permissionId,
    }))
  );

  // Create a location for the branch
  const branchLocation = await Location.create({
    id: uuidv4(),
    address: "Bole Road, Addis Ababa, Ethiopia",
    latitude: 9.005401,
    longitude: 38.763611,
  });

  // Create a branch for the restaurant
  const branch = await Branch.create({
    id: uuidv4(),
    restaurant_id: restaurant.id,
    location_id: branchLocation.id,
    name: "Bole Branch",
    status: "active",
    main_branch: false,
    opening_time: "08:00:00",
    closing_time: "22:00:00",
  });

  // Create a staff user assigned to the branch
  const staffUser = await User.create({
    id: uuidv4(),
    first_name: "John",
    last_name: "Doe",
    email: "staff1@gmail.com",
    password: "12345678",
    role_id: staffRole.id,
    role_tag_id: staffRoleTag.id,
    restaurant_id: restaurant.id,
    branch_id: branch.id, // Assigning to the branch we just created
    is_active: true,
    email_verified_at: now,
    password_changed_at: now,
    created_by: restaurantAdminUser.id,
  });

  // Delete temp user
  await tempUser.destroy();

  console.log(`
✅ Seeding completed successfully:

`);
};
