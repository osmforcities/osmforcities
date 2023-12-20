import fs from "fs-extra";
import {
  S3Client,
  GetObjectCommand,
  UploadPartCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";

class S3Handler {
  constructor() {
    this.s3 = new S3Client({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
    });

    this.bucketName = process.env.AWS_S3_BUCKET_NAME || "osm-for-cities";
  }

  async download(key, filePath) {
    const { Body } = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );

    await new Promise((resolve, reject) => {
      Body.pipe(fs.createWriteStream(filePath))
        .on("error", reject)
        .on("close", resolve);
    });
  }

  async upload(filePath, key) {
    const multipartUpload = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );

    const parts = await this.splitFileIntoParts(filePath);

    const uploadedParts = await Promise.all(
      parts.map(async (part) => {
        const uploadResult = await this.s3.send(
          new UploadPartCommand({
            Bucket: this.bucketName,
            Key: key,
            PartNumber: part.number,
            UploadId: multipartUpload.UploadId,
            Body: part.data,
          })
        );

        return {
          ETag: uploadResult.ETag,
          PartNumber: part.number,
        };
      })
    );

    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: multipartUpload.UploadId,
        MultipartUpload: {
          Parts: uploadedParts,
        },
      })
    );
  }

  async splitFileIntoParts(filePath) {
    const fileSize = (await fs.stat(filePath)).size;
    const partSize = 10 * 1024 * 1024; // 10MB
    const numberOfParts = Math.ceil(fileSize / partSize);

    const parts = [];
    for (let i = 0; i < numberOfParts; i++) {
      const start = i * partSize;
      const end = Math.min(start + partSize - 1, fileSize - 1);
      const partData = fs.createReadStream(filePath, { start, end });

      parts.push({ number: i + 1, data: partData });
    }

    return parts;
  }
}

export default S3Handler;
