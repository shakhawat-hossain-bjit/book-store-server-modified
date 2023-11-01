const express = require("express");
// const FileController = require("../controller/FileController");
const { MulterError } = require("multer");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectAclCommand,
} = require("@aws-sdk/client-s3");

const uploadFile = async function (file, folderName) {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  console.log(file);
  const key = `images/${folderName}/${Date.now()}-${file?.originalname}`;
  const s3Params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
  };
  console.log("s3 params: ", s3Params);
  await s3Client.send(new PutObjectCommand(s3Params));
  return `${s3Params.Key}`;
};

const deleteFile = async function (key) {
  try {
    // key = "images/books_images/1698805735458-book.png";
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    // const key = fileUrl.split("/").slice(-2).join("/");
    console.log(`To delete: ${key}`);
    const s3Params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
    };
    const result = await s3Client.send(new DeleteObjectCommand(s3Params));
    console.log(`File deleted result:`, result);
  } catch (error) {
    console.error(`Error deleting file: ${error.message}`);
    throw error;
  }
};

const playTemporaryVideo = async function (videoKey) {
  console.log("url ", videoKey);
  const s3Client = new S3Client({ region: process.env.AWS_REGION });

  // Set the parameters
  // const bucketName = "your-bucket-name";
  // const keyName = "your-video-file-name";
  // const objectParams = { Bucket: bucketName, Key: keyName };

  // Set the ACL to private
  const aclParams = {
    Bucket: process.env.S3_BUCKET,
    Key: videoKey,
    ACL: "private",
  };
  const aclData = await s3Client.send(new PutObjectAclCommand(aclParams));
  console.log("Successfully set video ACL to private ", aclData);

  // const videoUrl = s3.getSignedUrl("getObject", {
  //   Bucket: process.env.S3_BUCKET,
  //   Key: videoKey,
  //   Expires: 60 * 5, // URL expiration time in seconds (adjust as needed)
  // });
  // return videoUrl;
};

// const deleteFolder = async function (folderName) {
//   try {
//     console.log(`Folder to delete: ${folderName}`);
//     const s3Client = new S3Client({ region: S3_REGION });
//     const s3Params = {
//       Bucket: S3_BUCKET,
//       Prefix: folderName,
//     };

//     const data = await s3Client.send(new ListObjectsV2Command(s3Params));

//     if (data && data.Contents) {
//       console.log(`Data: ${data}`);
//       const keys = data.Contents.map((object) => object.Key);
//       console.log(`Keys to delete: ${keys}`);
//       const deleteParams = {
//         Bucket: S3_BUCKET,
//         Delete: {
//           Objects: keys.map((Key) => ({ Key })),
//         },
//       };
//       await s3Client.send(new DeleteObjectsCommand(deleteParams));
//       console.log(`Folder deleted successfully: ${folderName}`);
//     } else {
//       console.log("No objects found in the folder. The folder may not exist.");
//     }
//   } catch (error) {
//     console.error(`Error deleting folder: ${error.message}`);
//     throw error;
//   }
// };

const getAllFilesInFolder = async function (folderName) {
  try {
    console.log(`Fetching files in folder: ${folderName}`);
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const s3Params = {
      Bucket: process.env.S3_BUCKET,
      Prefix: folderName,
    };

    const data = await s3Client.send(new ListObjectsV2Command(s3Params));

    console.log(" data.Contents ", data.Contents);

    if (data && data.Contents) {
      const fileUrls = data.Contents.map((object) => {
        return `${process.env.S3_BASE_URL}/${object.Key}`;
      });
      console.log(`Files in folder: ${folderName}`);
      console.log(fileUrls);
      return fileUrls;
    } else {
      console.log("No files found in the folder. The folder may not exist.");
      return [];
    }
  } catch (error) {
    console.error(`Error listing files in folder: ${error.message}`);
    throw error;
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  getAllFilesInFolder,
  playTemporaryVideo,
};
