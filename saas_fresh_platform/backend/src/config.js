const path = require('path');
const dotenv = require('dotenv');

const dotenvResult = dotenv.config({
  path: path.join(__dirname, '..', '.env'),
  override: true
});

const parsedEnv = dotenvResult.parsed || {};

function getEnv(name, fallback) {
  if (Object.prototype.hasOwnProperty.call(parsedEnv, name)) {
    return parsedEnv[name];
  }

  if (process.env[name] !== undefined) {
    return process.env[name];
  }

  return fallback;
}

module.exports = {
  port: Number(getEnv('PORT', 4500)),
  jwtSecret: getEnv('JWT_SECRET', 'dev-secret-change-me'),
  adminApiKey: getEnv('ADMIN_API_KEY', 'dev-admin-key'),
  baseDownloadUrl: getEnv('BASE_DOWNLOAD_URL', 'https://downloads.example.com/files'),
  mysqlHost: getEnv('MYSQL_HOST', 'localhost'),
  mysqlPort: Number(getEnv('MYSQL_PORT', 3306)),
  mysqlUser: getEnv('MYSQL_USER', 'saas_user'),
  mysqlPassword: getEnv('MYSQL_PASSWORD', 'saas_password'),
  mysqlDatabase: getEnv('MYSQL_DATABASE', 'saas_fresh'),
  seedAdminEmail: getEnv('SEED_ADMIN_EMAIL', 'admin@saasfresh.local'),
  seedAdminPassword: getEnv('SEED_ADMIN_PASSWORD', 'ChangeThisAdminPassword')
};
