const express = require("express");
const routes = express();
const AuthController = require("../controller/AuthController");
const { authValidator } = require("../middleware/validation");
const { checkToken } = require("../middleware/auth");

routes.post("/log-in", authValidator.login, AuthController.login);
routes.post("/sign-up", authValidator.signup, AuthController.signup);

routes.post("/forget-password", AuthController.forgetPassword);
routes.post("/check-token", AuthController.validatePasswordResetRequest);
routes.post("/reset-password", AuthController.resetPassword);

routes.get(
  "/check-me/:token",
  authValidator.jwtValidator,
  checkToken,
  AuthController.aboutMe
);

module.exports = routes;
