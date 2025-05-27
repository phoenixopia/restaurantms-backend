const { Role, RolePermission, Permission } = require("../models");

exports.sendTokenResponse = async (user, statusCode, res, reqUrl) => {
  try {
    const role = await Role.findByPk(user.role_id, {
      include: [
        {
          model: RolePermission,
          where: { granted: true },
          required: false,
          include: [
            {
              model: Permission,
              attributes: ["name"],
            },
          ],
        },
      ],
    });

    const permissions =
      role.RolePermissions?.map(
        (rp) => rp.Permission?.code || rp.Permission?.name
      ) || [];

    const token = await user.getJwtToken();
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Set true in production with HTTPS
      sameSite: "Lax",
      maxAge: 8 * 60 * 60 * 1000,
    };

    const isCustomer = reqUrl.includes("/customer");
    if (isCustomer) {
      const {
        id,
        first_name,
        last_name,
        email,
        phone_number,
        address,
        profile_picture,
        email_verified_at,
        phone_verified_at,
        social_provider,
        social_provider_id,
        last_login_at,
        last_login_ip,
        login_count,
        is_active,
        language,
        timezone,
        device_type,
        role_id,
      } = user;

      return res.status(statusCode).cookie("token", token, cookieOptions).json({
        success: true,
        token,
        user: {
          id,
          first_name,
          last_name,
          email,
          phone_number,
          address,
          profile_picture,
          email_verified_at,
          phone_verified_at,
          social_provider,
          social_provider_id,
          last_login_at,
          last_login_ip,
          login_count,
          is_active,
          language,
          timezone,
          device_type,
          role_id,
        },
      });
    }

    return res
      .status(statusCode)
      .cookie("token", token, cookieOptions)
      .json({
        success: true,
        data: {
          id: user.id,
          role: role.name,
          permissions,
        },
      });
  } catch (error) {
    console.error("Error generating token with permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
