// seeders/seed_permission.js
"use strict";

const { Permission } = require("../models");
const { v4: uuidv4 } = require("uuid");

module.exports = async () => {
  const permissions = [
    // ==================== RBAC PERMISSIONS ====================
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
    {
      name: "create_permission",
      description: "Permission to create new permissions",
    },
    {
      name: "update_permission",
      description: "Permission to update existing permissions",
    },
    { name: "view_permission", description: "Permission to view permissions" },

    // ==================== RESTAURANT PERMISSIONS ====================
    {
      name: "view_restaurant",
      description: "Permission to view restaurant information",
    },
    {
      name: "update_restaurant",
      description: "Permission to update restaurant information",
    },

    // ==================== BRANCH PERMISSIONS ====================
    { name: "view_branch", description: "Permission to view branches" },
    {
      name: "update_branch",
      description: "Permission to update existing branches",
    },
    {
      name: "toggle_branch_status",
      description: "Permission to toggle branch activation status",
    },

    // ==================== CONTACT INFO PERMISSIONS ====================
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

    // ==================== BANK ACCOUNT PERMISSIONS ====================
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

    // ==================== CHARGE SETTING PERMISSIONS ====================
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

    // ==================== MENU PERMISSIONS ====================
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
      description: "Permission to toggle menu category activation status",
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
      description: "Permission to toggle menu item activation status",
    },
    { name: "view_menu_item", description: "Permission to view menu items" },

    // ==================== ORDER PERMISSIONS ====================
    { name: "view_order", description: "Permission to view orders" },
    {
      name: "change_order_status",
      description: "Permission to change order status",
    },

    // ==================== CATERING PERMISSIONS ====================
    {
      name: "create_catering",
      description: "Permission to create catering services",
    },
    {
      name: "update_catering",
      description: "Permission to update catering services",
    },
    {
      name: "view_catering",
      description: "Permission to view catering services",
    },
    {
      name: "delete_catering",
      description: "Permission to delete catering services",
    },
    {
      name: "view_catering_request",
      description: "Permission to view catering requests",
    },
    {
      name: "manage_catering",
      description: "Permission to manage catering requests and responses",
    },
    {
      name: "prepare_catering_quote",
      description: "Permission to prepare catering quotes",
    },
    {
      name: "update_catering_quote",
      description: "Permission to update catering quotes",
    },
    {
      name: "view_catering_quote",
      description: "Permission to view catering quotes",
    },

    // ==================== INVENTORY PERMISSIONS ====================
    {
      name: "view_inventory",
      description: "Permission to view inventory items and transactions",
    },
    {
      name: "update_inventory",
      description: "Permission to update inventory items",
    },
    {
      name: "create_inventory",
      description: "Permission to create new inventory items",
    },
    {
      name: "delete_inventory",
      description: "Permission to delete inventory items",
    },
    {
      name: "adjust_inventory",
      description: "Permission to adjust inventory quantities",
    },

    // ==================== SOCIAL MEDIA PERMISSIONS ====================
    {
      name: "manage_social_media",
      description: "Permission to manage social media content and videos",
    },
    { name: "edit_video", description: "Permission to edit videos" },
    { name: "delete_video", description: "Permission to delete videos" },
    { name: "see_review_rating", description: "Permission to view reviews" },
  ];

  await Permission.bulkCreate(permissions.map((p) => ({ ...p, id: uuidv4() })));

  console.log("✅ Permissions seeded successfully");
};
