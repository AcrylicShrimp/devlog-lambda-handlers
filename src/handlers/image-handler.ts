import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';
import { encode } from 'blurhash';
import * as https from 'https';
import sharp from 'sharp';
import { Readable } from 'stream';

interface ImageHandlerPayload {
  region: string;
  bucket: string;
  key: string;
}

async function sendResult(
  postUUID: string,
  imageUUID: string,
  body: {
    validity: 'valid' | 'invalid';
    width?: number;
    height?: number;
    hash?: string;
    title?: string;
    url?: string;
  },
): Promise<void> {
  const data = JSON.stringify(body);
  const req = https.request({
    host: process.env.BACKEND_IMAGE_HOST!,
    method: 'PUT',
    path: `${process.env.BACKEND_IMAGE_PATH_PREFIX!}/${postUUID}/images/${imageUUID}`,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  });

  await new Promise((resolve, reject) => {
    req.on('error', reject);
    req.write(data);
    req.end(resolve);
  });
}

export const handler: Handler<ImageHandlerPayload> = async (event) => {
  const s3 = new S3Client({
    region: event.region,
  });
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: event.bucket,
      Key: event.key,
    }),
  );

  const postUUID = result.Metadata?.['post-uuid']?.trim();
  const imageUUID = result.Metadata?.['image-uuid']?.trim();
  const title = result.Metadata?.['title']?.trim();

  if (typeof postUUID !== 'string' || !postUUID || typeof imageUUID !== 'string' || !imageUUID) return;

  try {
    if (typeof title !== 'string' || !title) {
      await sendResult(postUUID, imageUUID, { validity: 'invalid' });
      return;
    }

    const image = sharp(
      await new Promise<Buffer>((resolve, reject) => {
        try {
          if (!result.Body) throw new Error();

          const chunks: Uint8Array[] = [];

          (result.Body as Readable).on('error', reject);
          (result.Body as Readable).on('data', (chunk) => chunks.push(chunk));
          (result.Body as Readable).on('end', () => resolve(Buffer.concat(chunks)));
        } catch (err) {
          reject(err);
        }
      }),
    );
    const { width, height } = await image.metadata();

    if (!width || !height) {
      await sendResult(postUUID, imageUUID, { validity: 'invalid' });
      return;
    }

    const maxDim = Math.max(width, height);
    let resizedWidth: number;
    let resizedHeight: number;

    if (maxDim === width) {
      resizedWidth = 100;
      resizedHeight = Math.round((100 / width) * height);
    } else {
      resizedWidth = Math.round((100 / height) * width);
      resizedHeight = 100;
    }

    const minComponentCount = Math.max(1, Math.round(Math.min(width, height) / Math.max(1, Math.floor(maxDim / 5))));
    const componentX = maxDim === width ? 5 : minComponentCount;
    const componentY = maxDim === width ? minComponentCount : 5;

    const hash = encode(
      Uint8ClampedArray.from(
        await image
          .resize(maxDim === width ? { width: 100 } : { height: 100 })
          .ensureAlpha()
          .toFormat('raw')
          .toBuffer(),
      ),
      resizedWidth,
      resizedHeight,
      componentX,
      componentY,
    );

    await sendResult(postUUID, imageUUID, {
      validity: 'valid',
      width,
      height,
      hash,
      title,
      url: `${process.env.CDN_IMAGE_URL_PREFIX!}/${event.key}`,
    });
  } catch {
    await sendResult(postUUID, imageUUID, { validity: 'invalid' });
    return;
  }
};
