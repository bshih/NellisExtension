const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    'service-worker': './src/background/service-worker.ts',
    popup: './src/popup/popup.ts',
    content: './src/content/content.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              noEmit: false,
            },
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '../manifest.json' },
        { from: 'src/popup/popup.html', to: '../popup/popup.html' },
        { from: 'src/popup/popup.css', to: '../popup/popup.css' },
        { from: 'src/content/content.css', to: 'content.css' },
        { from: 'assets', to: '../assets' },
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
  devtool: 'cheap-module-source-map',
};
