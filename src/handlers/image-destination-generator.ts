import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { S3Client } from '@aws-sdk/client-s3';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { randomBytes } from 'crypto';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if ((event.headers['content-type'] ?? '') !== 'text/plain')
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'body should be non-empty text/plain',
        }),
      };

    const title = event.body?.trim();

    if (!title)
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'body should be non-empty text/plain',
        }),
      };

    const token = await new Promise<string>((resolve, reject) =>
      randomBytes(32, (err, buf) => (err ? reject(err) : resolve(buf.toString('hex')))),
    );
    const s3 = new S3Client({
      region: process.env.AWS_S3_REGION!,
    });
    const result = await createPresignedPost(s3, {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: `${process.env.S3_BUCKET_KEY_PREFIX_IMAGE!}${token}`,
      Conditions: [
        {
          'x-amz-meta-title': title,
        },
      ],
      Fields: {
        'x-amz-meta-title': title,
      },
    });

    return {
      statusCode: 201,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error(`An error occurred: ${err}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'internal server error' }),
    };
  }
};
