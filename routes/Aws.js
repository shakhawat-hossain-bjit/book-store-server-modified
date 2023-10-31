const express = require("express");
const routes = express();
const upload = require("../utils/file");
const FileControllerAws = require("../controller/FileControllerAws");

routes.post(
  "/upload-file",
  upload.single("file"),
  FileControllerAws.uploadFileAws
);

module.exports = routes;
