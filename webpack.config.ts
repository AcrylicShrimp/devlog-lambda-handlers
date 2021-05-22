import path from 'path';
import type * as webpack from 'webpack';

const isProduction = process.env.NODE_ENV === 'production';

const config: webpack.Configuration = {
  mode: isProduction ? 'production' : 'development',
  target: false,
  // devtool: isProduction ? 'source-map' : 'eval-source-map',
  entry: {
    index: path.resolve('src', 'index.ts'),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
        },
      },
    ],
  },
  output: {
    publicPath: '/',
    path: path.resolve('dist'),
    filename: '[name].js',
  },
};

export default config;
