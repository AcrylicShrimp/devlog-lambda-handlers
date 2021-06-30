import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';
import { encode } from 'blurhash';
import * as https from 'https';
import sharp from 'sharp';
import { Readable } from 'stream';

interface ThumbnailHandlerPayload {
  region: string;
  bucket: string;
  key: string;
}

async function sendResult(
  postUUID: string,
  body: {
    validity: 'valid' | 'invalid';
    width?: number;
    height?: number;
    hash?: string;
    url?: string;
  },
): Promise<void> {
  const data = JSON.stringify(body);
  const req = https.request({
    host: process.env.BACKEND_HOST!,
    method: 'PUT',
    path: `${process.env.BACKEND_PATH_PREFIX!}/${postUUID}/thumbnail`,
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

export const handler: Handler<ThumbnailHandlerPayload> = async (event) => {
  const s3 = new S3Client({
    region: event.region,
  });
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: event.bucket,
      Key: event.key,
    }),
  );

  if (!result.ContentType?.startsWith('image/')) return;

  const postUUID = result.Metadata?.['post-uuid']?.trim();

  if (typeof postUUID !== 'string' || !postUUID) return;

  try {
    const thumbnail = sharp(
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
    const { width, height } = await thumbnail.metadata();

    if (!width || !height) {
      await sendResult(postUUID, { validity: 'invalid' });
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
        await thumbnail
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

    await sendResult(postUUID, {
      validity: 'valid',
      width,
      height,
      hash,
      url: `${process.env.CDN_URL_PREFIX!}/${event.key}`,
    });
  } catch (err) {
    await sendResult(postUUID, { validity: 'invalid' });
    throw err;
  }
};
