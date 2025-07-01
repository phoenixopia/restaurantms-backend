const express = require('express');
const router = express.Router();
const controllers = require('../controllers/modelController');
const { Table, OrderItem, Order, Review, User, MenuItem, Menu, MenuCategory, Restaurant, Plan } = require('../models/index');
const { protect } = require('../middleware/protect');
const { authorize } = require('../middleware/authorize');



// Generic CRUD routes
const bindCRUD = (path, Model, middlewares = [], includes = [], restrictByRestaurant = false, fieldName = 'key', customWhere = () => ({})) => {
  router.post(`/${path}`, controllers.createModel(Model));
  router.get(`/${path}`, ...middlewares, controllers.getAllModels(Model, includes, restrictByRestaurant));
  router.get(`/${path}/latest`, controllers.getLatestModel(Model, includes));
  router.get(`/${path}/values/:value`, controllers.getModelByValue(Model, fieldName, includes));
  router.get(`/${path}/:id`, controllers.getModelById(Model, includes));
  router.put(`/${path}/:id`, controllers.updateModel(Model, includes));
  router.delete(`/${path}/:id`, controllers.deleteModel(Model));
};


// routes
bindCRUD('/tables', Table, [protect], [],true);
bindCRUD('/order/items',  OrderItem, [protect], [], true);
bindCRUD('/orders',  Order, [protect], [], true);
bindCRUD('/menu/items',  MenuItem, [protect,], true);
bindCRUD('/menu/categories',  MenuCategory, [protect,], [], true);
bindCRUD('/menus',  Menu, [protect], [
  { model: MenuCategory , as: 'categories'},
  { model: MenuItem, as: 'items' },
  { model: Restaurant, as: 'restaurant' },
], true);

// plan
bindCRUD('plans',  Plan, [protect,]);

// review
bindCRUD('reviews', Review,[], [ { model: MenuItem, as: 'item',}, {model: User, as: 'customer', attributes: ['first_name', 'last_name', 'email', 'phone_number','profile_picture']}]);


module.exports = router;
