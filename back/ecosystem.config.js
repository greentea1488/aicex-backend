module.exports = {
  apps: [
    {
      name: "ai-back", // Replace with your app name
      script: "npm",
      args: "run start", // Command to start your app
      env_production: {
        NODE_ENV: "production", // Set NODE_ENV to 'production'
      },
    },
  ],
};
