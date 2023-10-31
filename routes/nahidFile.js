const express = require("express");
const routes = express();
const upload = require("../utils/file");
// const FileController = require("../controller/FileController");
const { MulterError } = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { AWS_REGION, S3_BUCKET, S3_BASE_URL } = process.env;

const uploadFile = async function (file) {
  const s3Client = new S3Client({ region: AWS_REGION });
  const key = `nahid-bucket-folder/${Date.now()}-${file.originalname}`;

  const s3Params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
  };
  console.log("s3 params: ", s3Params);
  await s3Client.send(new PutObjectCommand(s3Params));
  return `${s3Params.Key}`;
};

routes.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const response = await uploadFile(file); // Await the uploadFile function

    res.send(response);
  } catch (error) {
    // Handle errors here
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = routes;
