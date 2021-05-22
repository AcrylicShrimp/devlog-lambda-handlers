import { APIGatewayProxyHandler } from 'aws-lambda';
import * as sharp from 'sharp';

export const handler: APIGatewayProxyHandler = async (event) => {
  sharp({});

  return {
    statusCode: 201,
    body: JSON.stringify({ message: 'success' }),
  };
};
