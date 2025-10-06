module.exports = {
  apps: [
    {
      name: 'fuel-backend',
      cwd: './backend',
      script: 'src/server.js',
      node_args: '',
      env: {
        PORT: 4000,
        NODE_ENV: 'production'
      },
      env_development: {
        PORT: 4000,
        NODE_ENV: 'development'
      },
      watch: false
    },
    {
      name: 'fuel-frontend',
      cwd: './frontend',
      script: 'node_modules/react-scripts/scripts/start.js',
      env: {
        PORT: 3000,
        BROWSER: 'none'
      },
      watch: false
    }
  ]
};


