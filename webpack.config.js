const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
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
        {
          from: 'manifest.json',
          to: '../manifest.json',
          transform(content) {
            const manifest = JSON.parse(content.toString());
            // Normalize name (strip any existing Dev suffix)
            const baseName = manifest.name.replace(/\s*\(Dev\)$/, '');

            if (isDev) {
              manifest.name = baseName + ' (Dev)';
              manifest.icons = {
                '16': 'assets/icons-dev/icon-16.png',
                '32': 'assets/icons-dev/icon-32.png',
                '48': 'assets/icons-dev/icon-48.png',
                '128': 'assets/icons-dev/icon-128.png',
              };
              manifest.action.default_icon = manifest.icons;
            } else {
              manifest.name = baseName;
              manifest.icons = {
                '16': 'assets/icons/icon-16.png',
                '32': 'assets/icons/icon-32.png',
                '48': 'assets/icons/icon-48.png',
                '128': 'assets/icons/icon-128.png',
              };
              manifest.action.default_icon = manifest.icons;
            }
            return JSON.stringify(manifest, null, 2);
          },
        },
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
};
