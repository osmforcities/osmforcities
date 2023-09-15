import fs from "fs";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || "osm-for-cities";

export async function download(key, filePath) {
  const { Body } = await s3.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  await new Promise((resolve, reject) => {
    Body.pipe(fs.createWriteStream(filePath))
      .on("error", (err) => reject(err))
      .on("close", () => resolve());
  });
}

export async function upload(filePath, key) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fs.readFileSync(filePath),
    })
  );
}

export default {
  download,
  upload,
};
