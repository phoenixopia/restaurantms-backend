const { Role, Permission, RoleTag } = require("../models");

exports.sendTokenResponse = async (
  user,
  statusCode,
  res,
  reqUrl = "/admin",
  requiresPasswordChange = false
) => {
  try {
    const isCustomer = reqUrl.includes("/customer");
    const token = await user.getJwtToken();

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 8 * 60 * 60 * 1000,
    };

    if (isCustomer) {
      return res.status(statusCode).cookie("token", token, cookieOptions).json({
        success: true,
        token,
        user,
      });
    }

    const roleTag = await RoleTag.findByPk(user.role_tag_id);

    let role = null;
    let rolePermissions = [];

    if (user.role_id) {
      role = await Role.findByPk(user.role_id, {
        include: [
          {
            model: Permission,
            attributes: ["name"],
            through: { attributes: [] },
          },
        ],
      });
      rolePermissions = role?.Permissions?.map((perm) => perm.name) || [];
    }

    const responseData = {
      id: user.id,
      full_name: user.full_name,
      email: user.email || null,
      phone_number: user.phone_number || null,
      profile_picture: user.profile_picture,
      role_tag: roleTag?.name || null,
      role: role?.name || null,
      permissions: rolePermissions,
      restaurant_id: user.restaurant_id || null,
      branch_id: user.branch_id || null,
    };

    if (!isCustomer && requiresPasswordChange) {
      responseData.requiresPasswordChange = true;
    }

    return res.status(statusCode).cookie("token", token, cookieOptions).json({
      success: true,
      token,
      data: responseData,
    });
  } catch (error) {
    console.error("Error generating token with permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
