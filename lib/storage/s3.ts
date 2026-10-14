import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getS3Config() {
  return {
    region: process.env.AWS_REGION || 'ap-south-2',
    bucket: requiredEnv('S3_BUCKET_NAME'),
    accessKeyId: requiredEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnv('AWS_SECRET_ACCESS_KEY'),
    publicBase:
      process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '') ||
      `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com`,
    keyPrefix: (process.env.S3_KEY_PREFIX || 'shophub').replace(/^\/+|\/+$/g, ''),
  };
}

let client: S3Client | null = null;

export function getS3Client() {
  if (client) return client;
  const { region, accessKeyId, secretAccessKey } = getS3Config();
  client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function s3PublicUrl(key: string) {
  const { publicBase } = getS3Config();
  return `${publicBase}/${key.replace(/^\/+/, '')}`;
}

export async function uploadImageToS3(params: {
  body: Buffer;
  contentType: string;
  folder: string;
  filename: string;
}) {
  const { bucket, keyPrefix } = getS3Config();
  const key = `${keyPrefix}/${params.folder}/${params.filename}`.replace(/\/+/g, '/');
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return { key, url: s3PublicUrl(key) };
}
