const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './frontend/js/app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/app.[contenthash].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './frontend/index.html',
      filename: 'index.html',
      inject: 'body'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend')
    }
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 8080,
    hot: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
};
