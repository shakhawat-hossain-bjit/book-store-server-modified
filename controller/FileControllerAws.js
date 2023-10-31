const HTTP_STATUS = require("../constants/statusCodes");
const uploadFile = require("../utils/awsConfig");
const { sendResponse } = require("../utils/common");

class FileControllerAws {
  async uploadFileAws(req, res) {
    try {
      const file = req.file;
      const response = await uploadFile(file, "uploadFromAPI"); // Await the uploadFile function
      console.log(response);
      return sendResponse(res, HTTP_STATUS.OK, response);
    } catch (error) {
      // Handle errors here
      console.error(error);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Internal server error"
      );
    }
  }
}

module.exports = new FileControllerAws();
