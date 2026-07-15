const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
    }),
    new CopyPlugin({
      patterns: [
        { from: 'img', to: 'img', noErrorOnMissing: true },
        { from: 'css', to: 'css', noErrorOnMissing: true },
        { from: 'js/vendor', to: 'js/vendor', noErrorOnMissing: true },
        { from: 'icon.svg', to: 'icon.svg', noErrorOnMissing: true },
        { from: 'favicon.ico', to: 'favicon.ico', noErrorOnMissing: true },
        { from: 'robots.txt', to: 'robots.txt', noErrorOnMissing: true },
        { from: 'icon.png', to: 'icon.png', noErrorOnMissing: true },
        { from: '404.html', to: '404.html', noErrorOnMissing: true },
        { from: 'site.webmanifest', to: 'site.webmanifest', noErrorOnMissing: true },
        { from: 'frontend', to: 'frontend' },
        { from: 'openapi.json', to: 'openapi.json' },
      ],
    }),
  ],
});
