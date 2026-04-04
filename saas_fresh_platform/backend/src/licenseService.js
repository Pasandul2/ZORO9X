const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { jwtSecret } = require('./config');

function generateActivationKey() {
  const seed = uuidv4().replace(/-/g, '').toUpperCase();
  return `${seed.slice(0, 4)}-${seed.slice(4, 8)}-${seed.slice(8, 12)}-${seed.slice(12, 16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function addDays(dateIso, days) {
  const date = new Date(dateIso);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function signRuntimeToken({ licenseId, userId, productId, deviceId, endDate }) {
  return jwt.sign(
    {
      licenseId,
      userId,
      productId,
      deviceId,
      endDate
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

module.exports = {
  generateActivationKey,
  nowIso,
  addDays,
  signRuntimeToken
};
