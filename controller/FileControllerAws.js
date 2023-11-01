const HTTP_STATUS = require("../constants/statusCodes");
const {
  uploadFile,
  playVideo,
  getAllFilesInFolder,
  playTemporaryVideo,
} = require("../utils/awsMethod");
const { sendResponse } = require("../utils/common");

class FileControllerAws {
  async uploadFileAws(req, res) {
    try {
      // const { fileNameBody } = req;
      console.log("------------------------- ", req);
      // console.log("req.fileName ", req.image);
      console.log("req.file ", req.file);
      const response = await uploadFile(req.file, "uploadFromAPI"); // Await the uploadFile function
      console.log("response ", response);
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

  async getAllFiles(req, res) {
    const { folder } = req.params;
    let fileUrls = await getAllFilesInFolder(folder);
    console.log("res ", fileUrls);
    return sendResponse(res, HTTP_STATUS.OK, fileUrls);
    // let videoUrl = await playVideo(fileUrl);
    // console.log("videoUrl ", videoUrl);

    // res.render("playVideo", { videoUrl });
  }

  async playVideo(req, res) {
    const { fileUrl } = req.body;

    let fileUrls = await playTemporaryVideo(fileUrl);
    console.log("res ", fileUrls);
    return sendResponse(res, HTTP_STATUS.OK, fileUrls);
  }
}

module.exports = new FileControllerAws();
