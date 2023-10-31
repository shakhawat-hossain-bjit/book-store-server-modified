const express = require("express");
const routes = express();
const FileController = require("../controller/FileController");
const upload = require("../utils/file");
const { uploadFileAWS } = require("../controller/uploadFile");

routes.post(
  "/upload-image",
  upload.single("image"),
  uploadFileAWS,
  FileController.uploadFile
);

// routes.post("/upload-file", upload.single("file"));

routes.get("/get/:filepath", FileController.getFile);

module.exports = routes;
