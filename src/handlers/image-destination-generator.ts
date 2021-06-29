import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { S3Client } from '@aws-sdk/client-s3';
import { APIGatewayProxyHandler } from 'aws-lambda';
import * as https from 'https';

const badRequestRes = {
  statusCode: 400,
  body: JSON.stringify({
    message: 'body should be a valid json that contains post-uuid and title properties',
  }),
};

export const handler: APIGatewayProxyHandler = async (event) => {
  if (!event.headers || event.headers['content-type'] !== 'application/json' || !event.body) return badRequestRes;

  let body;

  try {
    body = JSON.parse(event.body);
  } catch {
    return badRequestRes;
  }

  const postUUID = body['post-uuid']?.trim();
  const title = body.title?.trim();

  if (typeof postUUID !== 'string' || !postUUID || typeof title !== 'string' || !title) return badRequestRes;

  const req = https.request({
    host: process.env.BACKEND_IMAGE_HOST!,
    method: 'POST',
    path: `${process.env.BACKEND_IMAGE_PATH_PREFIX!}/${postUUID}/images`,
    timeout: 5000,
    headers: {
      Accept: 'application/json',
      'Accept-Charset': 'utf-8',
    },
  });
  const res = await new Promise<string>((resolve, reject) => {
    req.on('error', reject);
    req.on('response', (res) => {
      if (res.statusCode !== 201) return reject(`the server returned: ${res.statusCode} ${res.statusMessage}`);

      const chunks: Buffer[] = [];

      res.on('error', reject);
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.end();
  });
  const imageUUID = JSON.parse(res).uuid;

  const s3 = new S3Client({
    region: process.env.AWS_S3_REGION!,
  });
  const result = await createPresignedPost(s3, {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: `${process.env.S3_BUCKET_KEY_PREFIX!}${postUUID}/images/${imageUUID}`,
    Conditions: [
      {
        'x-amz-meta-post-uuid': postUUID,
      },
      {
        'x-amz-meta-image-uuid': imageUUID,
      },
      {
        'x-amz-meta-title': title,
      },
      ['starts-with', '$Content-Type', 'image/'],
    ],
    Fields: {
      'x-amz-meta-post-uuid': postUUID,
      'x-amz-meta-image-uuid': imageUUID,
      'x-amz-meta-title': title,
    },
  });

  return {
    statusCode: 201,
    body: JSON.stringify(result),
  };
};
