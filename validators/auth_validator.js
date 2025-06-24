const { body } = require("express-validator");

exports.registerValidator = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required.")
    .bail()
    .matches(/^[A-Za-z\s'-]+$/)
    .withMessage("First name must not contain numbers or special characters."),

  body("lastName")
    .notEmpty()
    .withMessage("Last name is required.")
    .bail()
    .matches(/^[A-Za-z\s'-]+$/)
    .withMessage("Last name must not contain numbers or special characters."),

  body("signupMethod")
    .notEmpty()
    .withMessage("Signup method is required.")
    .bail()
    .isIn(["email", "phone"])
    .withMessage("Signup method must be 'email' or 'phone'"),

  body("emailOrPhone")
    .notEmpty()
    .withMessage("Email or phone is required.")
    .bail()
    .custom((value, { req }) => {
      if (req.body.signupMethod === "email" && !/\S+@\S+\.\S+/.test(value)) {
        throw new Error("Invalid email format.");
      }
      return true;
    }),

  body("password")
    .if(body("signupMethod").equals("email"))
    .notEmpty()
    .withMessage("Password is required for email signup.")
    .bail()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
];

exports.loginValidator = [
  body("emailOrPhone")
    .notEmpty()
    .withMessage("Email or phone is required.")
    .bail(),

  body("signupMethod")
    .notEmpty()
    .withMessage("Signup method is required.")
    .bail()
    .isIn(["email", "phone"])
    .withMessage("Invalid signup method."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .bail()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
];

exports.verifyCodeValidator = [
  body("emailOrPhone")
    .notEmpty()
    .withMessage("Email or phone is required.")
    .bail(),

  body("signupMethod")
    .notEmpty()
    .withMessage("Signup method is required.")
    .bail()
    .isIn(["email", "phone"])
    .withMessage("Signup method must be either 'email' or 'phone'."),

  body("code")
    .notEmpty()
    .withMessage("Code is required.")
    .bail()
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits."),
];

exports.resendCodeValidator = [
  body("emailOrPhone")
    .notEmpty()
    .withMessage("Email or phone is required.")
    .bail(),

  body("signupMethod")
    .notEmpty()
    .withMessage("Signup method is required.")
    .bail()
    .isIn(["email", "phone"])
    .withMessage("Signup method must be either 'email' or 'phone'."),
];

exports.forgotPasswordValidator = [
  body("emailOrPhone")
    .notEmpty()
    .withMessage("Email or phone is required.")
    .bail(),

  body("signupMethod")
    .notEmpty()
    .withMessage("Signup method is required.")
    .bail()
    .isIn(["email", "phone"])
    .withMessage("Signup method must be either 'email' or 'phone'."),
];

exports.resetPasswordValidator = [
  body("emailOrPhone")
    .notEmpty()
    .withMessage("Email or phone is required.")
    .bail(),

  body("signupMethod")
    .notEmpty()
    .withMessage("Signup method is required.")
    .bail()
    .isIn(["email", "phone"])
    .withMessage("Signup method must be either 'email' or 'phone'."),

  body("code")
    .notEmpty()
    .withMessage("Reset code is required.")
    .bail()
    .isLength({ min: 6, max: 6 })
    .withMessage("Reset code must be 6 digits."),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .bail()
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long."),
];

exports.googleLoginValidator = [
  body("idToken").notEmpty().withMessage("Google ID token is required."),
];
