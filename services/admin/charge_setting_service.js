const { Op, fn, col, literal, QueryTypes, where } = require("sequelize");
const throwError = require("../../utils/throwError");
const {
  ChargeSetting,
  Restaurant,
  Branch,
  sequelize,
} = require("../../models");

const feeTypeEnum = ["fixed", "dynamic"];

const isDecimal = (val) =>
  val === null || val === undefined || (!isNaN(val) && val !== "");

const isEnumValue = (val, enumArr) =>
  val === null || val === undefined || enumArr.includes(val);

const isValidDynamicFee = (val, keys) => {
  if (val === null || val === undefined) return true;
  if (typeof val !== "object") return false;
  return keys.every((k) => typeof val[k] === "number");
};

const ChargeSettingService = {
  async getChargeSetting(user) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id, {
        attributes: ["id", "restaurant_id"],
      });
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User is not linked to any restaurant or branch", 400);
    }

    const chargeSetting = await ChargeSetting.findOne({
      where: { restaurant_id: restaurantId },
      include: [
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
        },
      ],
    });

    if (!chargeSetting) throwError("Charge setting not found", 404);

    return {
      restaurant: {
        id: chargeSetting.Restaurant.id,
        name: chargeSetting.Restaurant.restaurant_name,
      },
      service_charge_fee: chargeSetting.service_charge_fee,
      package_charge_fee: chargeSetting.package_charge_fee,
      delivery_fee_type: chargeSetting.delivery_fee_type,
      delivery_fee_fixed: chargeSetting.delivery_fee_fixed,
      delivery_fee_dynamic: chargeSetting.delivery_fee_dynamic,
      dine_in_fee_type: chargeSetting.dine_in_fee_type,
      dine_in_fee_fixed: chargeSetting.dine_in_fee_fixed,
      dine_in_fee_dynamic: chargeSetting.dine_in_fee_dynamic,
    };
  },

  async syncUpsertChargeSetting(user, data) {
    const {
      service_charge_fee,
      package_charge_fee,
      delivery_fee_type,
      delivery_fee_fixed,
      delivery_fee_dynamic,
      dine_in_fee_type,
      dine_in_fee_fixed,
      dine_in_fee_dynamic,
    } = data;

    if (
      !isDecimal(service_charge_fee) ||
      !isDecimal(package_charge_fee) ||
      !isDecimal(delivery_fee_fixed) ||
      !isDecimal(dine_in_fee_fixed)
    ) {
      throwError("Fee values must be decimal numbers or null", 400);
    }

    if (
      !isEnumValue(delivery_fee_type, feeTypeEnum) ||
      !isEnumValue(dine_in_fee_type, feeTypeEnum)
    ) {
      throwError(`Fee types must be one of: ${feeTypeEnum.join(", ")}`, 400);
    }

    if (
      !isValidDynamicFee(delivery_fee_dynamic, [
        "starting_fee",
        "price_per_meter",
        "minimum_fee",
      ]) ||
      !isValidDynamicFee(dine_in_fee_dynamic, [
        "price_per_guest",
        "price_per_hour",
        "minimum_fee",
      ])
    ) {
      throwError(
        "Dynamic fee fields must be objects with numeric keys as required",
        400
      );
    }

    let restaurantId;
    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id, {
        attributes: ["restaurant_id"],
      });
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User is not linked to any restaurant or branch", 400);
    }

    const restaurant = await Restaurant.findByPk(restaurantId);
    if (!restaurant) throwError("Restaurant not found", 404);

    let chargeSetting = await ChargeSetting.findOne({
      where: { restaurant_id: restaurantId },
    });

    if (chargeSetting) {
      await chargeSetting.update(data);
    } else {
      chargeSetting = await ChargeSetting.create({
        restaurant_id: restaurantId,
        ...data,
      });
    }

    return chargeSetting;
  },

  async deleteChargeSetting(user) {
    let restaurantId;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id, {
        attributes: ["restaurant_id"],
      });
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User is not linked to any restaurant or branch", 400);
    }

    const chargeSetting = await ChargeSetting.findOne({
      where: { restaurant_id: restaurantId },
    });

    if (!chargeSetting) {
      throwError("Charge setting not found", 404);
    }

    await chargeSetting.destroy();

    return true;
  },
};

module.exports = ChargeSettingService;
