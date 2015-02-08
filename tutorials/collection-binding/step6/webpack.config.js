var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: [
      "./example.js"
    ],
    output: {
        path: __dirname,
        filename: "build/app.js"
    },
    plugins: [new HtmlWebpackPlugin()],
    module: {
        loaders: [
            { test: /\.js$/,    loader: "jsx", query: { insertPragma: 'React.DOM' } }
        ]
    },
    resolveLoader: { root: path.join(__dirname, "node_modules") }
};
