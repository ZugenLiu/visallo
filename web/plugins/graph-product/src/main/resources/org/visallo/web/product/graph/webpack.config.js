var path = require('path');
var webpack = require('webpack');
var VisalloAmdExternals = [
    'components/DroppableHOC',
    'components/NavigationControls',
    'components/RegistryInjectorHOC',
    'configuration/plugins/registry',
    'data/web-worker/store/actions',
    'data/web-worker/store/product/actions',
    'data/web-worker/store/product/selectors',
    'data/web-worker/store/selection/actions',
    'data/web-worker/store/user/actions-impl',
    'data/web-worker/util/ajax',
    'public/v1/api',
    'util/formatters',
    'util/popovers/fileImport/fileImport',
    'util/vertex/formatters',
    'util/retina',
    'util/withContextMenu',
     // TODO: move to internal dep
    'cytoscape',
    'fast-json-patch',
    'updeep'
].map(path => ({ [path]: { amd: path }}));

module.exports = {
  entry: {
    Graph: './GraphContainer.jsx',
    'actions-impl': './worker/actions-impl.js',
    'plugin-worker': './worker/plugin.js',
    EdgeLabel: './options/EdgeLabel.jsx',
    SnapToGrid: './options/SnapToGrid.jsx'
  },
  output: {
    path: './dist',
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd',
  },
  externals: VisalloAmdExternals.concat([
    {
      react: {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react'
      },
    },
    {
      'react-dom': {
        root: 'ReactDOM',
        commonjs2: 'react-dom',
        commonjs: 'react-dom',
        amd: 'react-dom'
      }
    },
    {
      'redux': {
          amd: 'redux'
      }
    },
    {
      'react-redux': {
        amd: 'react-redux'
      }
    }
  ]),
  resolve: {
    extensions: ['', '.js', '.jsx', '.hbs']
  },
  module: {
    loaders: [
        {
            test: /\.jsx?$/,
            exclude: /(node_modules)/,
            loader: 'babel'
        }
    ]
  },
  devtool: 'source-map',
  plugins: [
//    new webpack.optimize.UglifyJsPlugin({
//        mangle: false
//    })
  ]
};
