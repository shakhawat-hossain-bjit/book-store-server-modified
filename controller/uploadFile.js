const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { S3_REGION, S3_BUCKET, S3_BASE_URL } = process.env;

const uploadFileAWS = async function (file, folderName) {
  console.log(file);
  const s3Client = new S3Client({ region: S3_REGION });
  const key = folderName
    ? `${folderName}/${Date.now()}-${file.originalname}`
    : `${Date.now()}-${file.originalname}`;
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: file.buffer,
  };
  await s3Client.send(new PutObjectCommand(s3Params));
  return `${S3_BASE_URL}/${s3Params.Key}`;
};

module.exports = { uploadFileAWS };
