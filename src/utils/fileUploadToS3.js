import AWS from "aws-sdk";
import "dotenv/config";
import fs from "fs";

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const uploadFileToS3 = async (filePath, fileName, bucketName, mimetype) => {
  const fileBuffer = fs.readFileSync(filePath);
  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
  };
  try {
    const data = await s3.upload(params).promise();
     fs.unlinkSync(filePath);
    return data.Location;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
};

const deleteFileFromS3 = async (key, bucketName) => {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  try {
    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
};

export { uploadFileToS3, deleteFileFromS3 };
