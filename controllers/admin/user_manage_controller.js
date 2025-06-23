const { User, Role, sequelize } = require("../../models");
const { Op } = require("sequelize");

exports.createUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const creatorId = req.user.id;
    const {
      creatorMode,
      first_name,
      last_name,
      email,
      phone_number,
      password,
    } = req.body;

    if (!first_name || !last_name || !password || !creatorMode) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (creatorMode === "email" && !email) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Email is required for email mode",
      });
    }

    if (creatorMode === "phone" && !phone_number) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Phone number is required for phone mode",
      });
    }

    const role = await Role.findOne({
      where: { name: "staff" },
      transaction: t,
    });
    if (!role) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Staff role not found",
      });
    }

    const whereClause = creatorMode === "email" ? { email } : { phone_number };
    const existingUser = await User.findOne({
      where: whereClause,
      transaction: t,
    });

    if (existingUser) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "A user with this email or phone number already exists",
      });
    }

    const newUser = await User.create(
      {
        first_name,
        last_name,
        email: creatorMode === "email" ? email : null,
        phone_number: creatorMode === "phone" ? phone_number : null,
        password,
        role_id: role.id,
        created_by: creatorId,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "User created successfully with staff role",
      user: {
        id: newUser.id,
        full_name: `${newUser.first_name} ${newUser.last_name}`,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role_id: newUser.role_id,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

exports.deleteUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, { transaction: t });

    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.destroy({ transaction: t });

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

exports.editUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      creatorMode,
      first_name,
      last_name,
      email,
      phone_number,
      password,
    } = req.body;

    const user = await User.findByPk(id, { transaction: t });

    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!creatorMode || !["email", "phone"].includes(creatorMode)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid or missing creatorMode",
      });
    }

    if (creatorMode === "email" && email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: { email, id: { [Op.ne]: id } },
        transaction: t,
      });
      if (existingEmail) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: "Email already in use by another user",
        });
      }
    }

    if (
      creatorMode === "phone" &&
      phone_number &&
      phone_number !== user.phone_number
    ) {
      const existingPhone = await User.findOne({
        where: { phone_number, id: { [Op.ne]: id } },
        transaction: t,
      });
      if (existingPhone) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: "Phone number already in use by another user",
        });
      }
    }

    user.first_name = first_name || user.first_name;
    user.last_name = last_name || user.last_name;
    user.email = creatorMode === "email" ? email : null;
    user.phone_number = creatorMode === "phone" ? phone_number : null;
    if (password) user.password = password;

    await user.save({ transaction: t });

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user.id,
        full_name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone_number: user.phone_number,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Error editing user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

exports.getCreatedUsers = async (req, res) => {
  try {
    const creatorId = req.user.id;

    const createdUsers = await User.findAll({
      where: { created_by: creatorId },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "is_active",
        "role_id",
        "createdAt",
      ],
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Created users retrieved successfully",
      users: createdUsers,
    });
  } catch (error) {
    console.error("Error fetching created users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch created users",
    });
  }
};

exports.searchCreatedUsers = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { search = "", page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereCondition = {
      created_by: creatorId,
      [Op.or]: [
        {
          first_name: {
            [Op.iLike]: `%${search}%`,
          },
        },
        {
          last_name: {
            [Op.iLike]: `%${search}%`,
          },
        },
      ],
    };

    const { count, rows } = await User.findAndCountAll({
      where: search ? whereCondition : { created_by: creatorId },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "is_active",
        "role_id",
        "createdAt",
      ],
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit: parseInt(limit),
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
};

exports.getCreatedUserById = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { id } = req.params;

    const user = await User.findOne({
      where: {
        id,
        created_by: creatorId,
      },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "is_active",
        "role_id",
        "createdAt",
      ],
      include: [
        {
          model: Role,
          attributes: ["id", "name"],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or you are not authorized to view this user",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};
