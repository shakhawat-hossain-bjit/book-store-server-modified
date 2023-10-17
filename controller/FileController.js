const path = require("path");

const HTTP_STATUS = require("../constants/statusCodes");

const fs = require("fs");
const { sendResponse } = require("../utils/common");
const { imgType } = require("../constants/fileTypes");

class FileController {
  async uploadFile(req, res, next) {
    try {
      if (!imgType.includes(req.file_extension)) {
        return sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Only .jpg, .png, .jpeg"
        );
      }

      if (!req.file) {
        return sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Failed to upload file"
        );
      }

      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Successfully uploaded file",
        req.file
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

  async getFile(req, res, next) {
    try {
      const { filepath } = req.params;
      const exists = fs.existsSync(
        path.join(__dirname, "..", "server", "images", filepath)
      );

      if (!exists) {
        return sendResponse(res, HTTP_STATUS.NOT_FOUND, "File not found");
      }
      return res
        .status(200)
        .sendFile(path.join(__dirname, "..", "server/images", filepath));
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }

  async uploadBookImage(req, res, next) {
    try {
      if (!imgType.includes(req.file_extension)) {
        return sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Only .jpg, .png, .jpeg"
        );
      }

      if (!req.file) {
        return sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Failed to upload file"
        );
      }

      next();
    } catch (error) {
      console.log(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }
}

module.exports = new FileController();
