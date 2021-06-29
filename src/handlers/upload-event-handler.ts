import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Handler } from 'aws-lambda';

export const handler: S3Handler = async (event) => {
  const client = new LambdaClient({
    region: process.env.AWS_LAMBDA_REGION!,
  });
  const encoder = new TextEncoder();

  await Promise.all(
    event.Records.map(async (record) => {
      const key = record.s3.object.key;
      let functionName;

      if (key.includes('/images/')) functionName = process.env.IMAGE_HANDLER_NAME!;
      else if (key.endsWith('/thumbnail')) functionName = process.env.THUMBNAIL_HANDLER_NAME!;
      else return;

      await client.send(
        new InvokeCommand({
          FunctionName: functionName,
          Payload: encoder.encode(
            JSON.stringify({
              region: record.awsRegion,
              bucket: record.s3.bucket.name,
              key: record.s3.object.key,
            }),
          ),
        }),
      );
    }),
  );
};
