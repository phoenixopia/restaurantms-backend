const { User, Restaurant, Menu, MenuCategory, MenuItem, Order, OrderItem, Role, Permission, Location, Branch } = require('../models/index');

exports.validateForeignKeys = async (idFields = {}) => {
  const modelMap = {
    user_id: User,
    restaurant_id: Restaurant,
    menu_id: Menu,
    menu_category_id: MenuCategory,
    menu_Item_id: MenuItem,
    role_id: Role,
    permission_id: Permission,
    location_id: Location, 
    manager_id: User,
    customer_id: User,
    branch_id: Branch,
    order_id: Order,
    order_item_id: OrderItem,

  };

  for (const [key, id] of Object.entries(idFields)) {
    if (id && modelMap[key]) {
      const exists = await modelMap[key].findByPk(id);
      if (!exists) {
        const formattedKey = key.replace('_id', '').replace(/_/g, ' ');
        return {
          success: false,
          message: `${formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1)} not found`
        };
      }
    }
  }

  return { success: true };
};
