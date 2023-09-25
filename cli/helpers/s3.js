import fs from "fs-extra";
import {
  S3Client,
  GetObjectCommand,
  UploadPartCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
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

export const upload = async (filePath, key) => {
  // Create a multipart upload.
  const multipartUpload = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  // Split the file into parts.
  const parts = await splitFileIntoParts(filePath);

  // Upload each part to S3.
  const partUploadPromises = parts.map(async (part) => {
    await s3.send(
      new UploadPartCommand({
        Bucket: bucketName,
        Key: key,
        PartNumber: part.number,
        UploadId: multipartUpload.UploadId,
        Body: part.data,
      })
    );
  });

  // Wait for all parts to be uploaded.
  await Promise.all(partUploadPromises);

  // Complete the multipart upload.
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: multipartUpload.UploadId,
    })
  );
};

const splitFileIntoParts = async (filePath) => {
  // Get the file size.
  const fileSize = (await fs.stat(filePath)).size;

  // Calculate the number of parts.
  const partSize = 10 * 1024 * 1024; // 5MB
  const numberOfParts = Math.ceil(fileSize / partSize);

  // Split the file into parts.
  const parts = [];
  for (let i = 0; i < numberOfParts; i++) {
    const partData = await fs.createReadStream(filePath, {
      start: i * partSize,
      end: (i + 1) * partSize - 1,
    });

    parts.push({
      number: i + 1,
      data: partData,
    });
  }

  return parts;
};

export default {
  download,
  upload,
};
