const express = require("express");
// const FileController = require("../controller/FileController");
const { MulterError } = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const uploadFile = async function (file, folderName) {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  console.log(file);
  const key = `images/${folderName}/${Date.now()}-${file.originalname}`;
  const s3Params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
  };
  console.log("s3 params: ", s3Params);
  await s3Client.send(new PutObjectCommand(s3Params));
  return `${s3Params.Key}`;
};

module.exports = uploadFile;
