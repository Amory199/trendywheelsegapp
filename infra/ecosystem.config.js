module.exports = {
  apps: [
    {
      name: "trendywheels-api",
      cwd: "./apps/api",
      script: "dist/server.js",
      instances: 2,
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      max_memory_restart: "500M",
      error_file: "/var/log/trendywheels/api-error.log",
      out_file: "/var/log/trendywheels/api-out.log",
      merge_logs: true,
    },
    {
      name: "trendywheels-admin",
      cwd: "./apps/admin",
      script: "node_modules/.bin/next",
      args: "start --port 3001",
      instances: 1,
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "500M",
    },
    {
      name: "trendywheels-support",
      cwd: "./apps/support",
      script: "node_modules/.bin/next",
      args: "start --port 3002",
      instances: 1,
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "500M",
    },
    {
      name: "trendywheels-inventory",
      cwd: "./apps/inventory",
      script: "node_modules/.bin/next",
      args: "start --port 3003",
      instances: 1,
      env_production: {
        NODE_ENV: "production",
      },
      max_memory_restart: "500M",
    },
  ],
};
