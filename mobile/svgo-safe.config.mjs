export default {
  multipass: false,
  js2svg: {
    pretty: false,
    indent: 0,
  },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          convertPathData: false,
          mergePaths: false,
          convertShapeToPath: false,
          cleanupIds: false,
          removeViewBox: false,
        },
      },
    },
    'removeDimensions',
  ],
};
