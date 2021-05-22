import { APIGatewayProxyHandler } from 'aws-lambda';
import * as sharp from 'sharp';
import * as fs from 'fs';

export const handler: APIGatewayProxyHandler = async (event) => {
  sharp({});
  fs.readFileSync('test');

  return {
    statusCode: 201,
    body: JSON.stringify({ message: 'success' }),
  };
};
