import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { S3Client } from '@aws-sdk/client-s3';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { randomBytes } from 'crypto';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const token = await new Promise<string>((resolve, reject) =>
      randomBytes(32, (err, buf) => (err ? reject(err) : resolve(buf.toString('hex')))),
    );
    const s3 = new S3Client({
      region: process.env.AWS_S3_REGION!,
    });
    const result = await createPresignedPost(s3, {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: `v1/unsaved/images/${token}`,
      Fields: {
        'x-amz-meta-title': event.body ?? '',
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
