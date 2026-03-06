module.exports = {
  presets: ["module:metro-react-native-babel-preset"],
  plugins: [
    [
      "module-resolver",
      {
        root: ["./src"],
        extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
        alias: {
          "@": "./src",
          "@components": "./src/components",
          "@screens": "./src/screens",
          "@services": "./src/services",
          "@utils": "./src/utils",
          "@types": "./src/types",
          "@hooks": "./src/hooks",
        },
      },
    ],
    "react-native-reanimated/plugin",
  ],
};
