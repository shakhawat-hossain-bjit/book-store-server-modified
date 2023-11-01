const express = require("express");
const routes = express();
const upload = require("../utils/file");
const FileControllerAws = require("../controller/FileControllerAws");

routes.post(
  "/upload-file",
  upload.single("file"),
  FileControllerAws.uploadFileAws
);

routes.get("/get-files/:folder", FileControllerAws.getAllFiles);

routes.post("/play-video", FileControllerAws.playVideo);

module.exports = routes;
