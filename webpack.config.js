const path = require("path");

module.exports = {
  entry: path.resolve(__dirname, "src/index.ts"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index_bundle.js",
    library: "$",
    libraryTarget: "umd",
    globalObject: "this"
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    fallback: {
      "buffer": require.resolve("buffer")
    }
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.(ts)$/,
        exclude: /node_modules/,
        use: "awesome-typescript-loader",
      },      
    ],
  },
  mode: "development"
};
