const { validationResult } = require("express-validator");
const HTTP_STATUS = require("../constants/statusCodes");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const AuthModel = require("../model/Auth");
const UserModel = require("../model/User");
const jsonwebtoken = require("jsonwebtoken");
const { sendResponse } = require("../utils/common");
const { insertInLog } = require("../server/logFile");
const path = require("path");
const transport = require("../utils/mailConfig");

const { promisify } = require("util");
const ejs = require("ejs");
const { default: mongoose } = require("mongoose");
const ejsRenderFile = promisify(ejs.renderFile);

class AuthModelController {
  async login(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, { email: req?.body?.email });
      const validation = validationResult(req).array();
      if (validation.length > 0) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Failed to add the user",
          validation
        );
      }
      const { email, password } = req.body;
      const auth = await AuthModel.findOne({ email: email })
        .populate("user", "-createdAt -updatedAt -__v")
        .select("-createdAt -updatedAt -__v");
      // console.log(auth);
      // console.log(req.body);
      if (!auth) {
        return sendResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          "User is not registered"
        );
      }

      const checkPassword = await bcrypt.compare(password, auth.password);

      if (!checkPassword) {
        return sendResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          "Invalid credentials"
        );
      }
      const responseAuthModel = auth.toObject();
      delete responseAuthModel.password;

      const jwt = jsonwebtoken.sign(responseAuthModel, process.env.SECRET_KEY, {
        expiresIn: "2 days",
      });

      responseAuthModel.token = jwt;
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Successfully logged in",
        responseAuthModel
      );
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async signup(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, {
        email: req?.body?.email,
        userName: req?.body?.userName,
        phone: req?.body?.phone,
      });
      const validation = validationResult(req).array();
      if (validation.length > 0) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Failed to add the user",
          validation
        );
      }
      const { userName, email, password, phone, address, role } = req.body;
      // console.log(req.body);
      const auth = await AuthModel.findOne({
        $or: [{ email: email }, { userName: userName }],
      });
      if (auth?.email == email && auth?.userName == userName) {
        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "Email is already registered and userName is not available",
          [
            { msg: "Email is already registered", path: "email" },
            { msg: "userName is not available", path: "userName" },
          ]
        );
      } else if (auth?.email == email) {
        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "Email is already registered",
          [{ msg: "Email is already registered", path: "email" }]
        );
      } else if (auth?.userName == userName) {
        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "userName is not available",
          [{ msg: "userName is not available", path: "userName" }]
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10).then((hash) => {
        return hash;
      });

      const user = await UserModel.create({
        userName: userName,
        email: email,
        phone: phone,
        address: address,
      });
      const result = await AuthModel.create({
        email: email,
        password: hashedPassword,
        userName: userName,
        role: role,
        verified: false,
        user: user._id,
      });
      if (!result) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Failed to add the user"
        );
      }

      return sendResponse(res, HTTP_STATUS.OK, "Successfully signed up", user);
    } catch (error) {
      // console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async aboutMe(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, req.params);
      const { authId } = req.body;

      const auth = await AuthModel.findOne({ _id: authId })
        .populate("user", "-createdAt -updatedAt -__v")
        .select("-createdAt -updatedAt -__v");

      const responseAuthModel = auth.toObject();
      delete responseAuthModel.password;

      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Valid Token Provided",
        responseAuthModel
      );
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async forgetPassword(req, res) {
    try {
      insertInLog(req?.originalUrl, req.query, req.params);
      const { email } = req.body;
      if (!email || email === "") {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Email is not provided"
        );
      }

      const auth = await AuthModel.findOne({ email }).populate("user");
      if (!auth) {
        return sendResponse(res, HTTP_STATUS.NOT_FOUND, "User not found");
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      console.log("resetToken ", resetToken);
      auth.resetPasswordToken = resetToken;
      auth.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
      auth.resetPassword = true;

      await auth.save();

      const resetUrl = path.join(
        process.env.FRONTEND_URL,
        "reset-password",
        resetToken,
        auth?._id.toString()
      );

      // console.log(resetUrl);

      const htmlBody = await ejsRenderFile(
        path.join(__dirname, "..", "views", "forgotPassword.ejs"),
        {
          name: auth.user.userName,
          resetURL: resetUrl,
        }
      );

      const result = await transport.sendMail({
        from: "myapp@system.com",
        to: `${auth.user.userName} ${email}`,
        // to: `shihab shihabctag@gmail.com`,
        subject: "Forget Password",
        html: htmlBody,
      });

      // console.log(result);

      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Check your email to get reset link"
      );
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async validatePasswordResetRequest(req, res) {
    try {
      const { token, authId } = req.body;

      const auth = await AuthModel.findOne({
        _id: new mongoose.Types.ObjectId(authId),
      });
      if (!auth) {
        return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Invalid request");
      }

      if (auth.resetPasswordExpire < Date.now()) {
        return sendResponse(res, HTTP_STATUS.GONE, "Expired request");
      }

      if (auth.resetPasswordToken !== token || auth.resetPassword === false) {
        return sendResponse(res, HTTP_STATUS.UNAUTHORIZED, "Invalid token");
      }
      return sendResponse(res, HTTP_STATUS.OK, "Request is still valid");
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Something went wrong!"
      );
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, authId, password, confirmPassword } = req.body;

      const auth = await AuthModel.findOne({
        _id: new mongoose.Types.ObjectId(authId),
      });

      //write validations...
      if (!auth) {
        return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Invalid request");
      }

      if (auth?.resetPasswordExpire < Date.now()) {
        return sendResponse(res, HTTP_STATUS.GONE, "Expired Token");
      }

      if (auth?.resetPasswordToken != token || auth?.resetPassword == false) {
        return sendResponse(res, HTTP_STATUS.UNAUTHORIZED, "Invalid token");
      }

      if (password != confirmPassword) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Password didn't match"
        );
      }

      if (await bcrypt.compare(password, auth?.password)) {
        return sendResponse(
          res,
          HTTP_STATUS.UNPROCESSABLE_ENTITY,
          "Password can't be same as previous"
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10).then((hash) => {
        return hash;
      });

      // write code to save the new password

      const result = await AuthModel.updateOne(
        { _id: authId },
        {
          $set: {
            password: hashedPassword,
            resetPassword: false,
            resetPasswordExpire: null,
            resetPasswordToken: null,
          },
        }
      );
      // console.log(result);

      if (result?.modifiedCount) {
        return sendResponse(
          res,
          HTTP_STATUS.OK,
          "Successfully updated password"
        );
      }
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Something went wrong!"
      );
    }
    // return sendResponse(res, HTTP_STATUS.OK, "Request is still valid");
  }
}

module.exports = new AuthModelController();
