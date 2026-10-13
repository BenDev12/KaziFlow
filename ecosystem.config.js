module.exports = {
  apps: [
    {
      name: 'solis-filed-server',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      // PM2 loads process.env from the shell it's started in — pair this with
      // `pm2 start ecosystem.config.js --env production` and a real .env
      // loaded via your shell profile or a tool like `dotenv-cli`/systemd
      // EnvironmentFile, since PM2 itself does not read .env files.
    },
  ],
};
