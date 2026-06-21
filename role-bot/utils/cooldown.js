const { COOLDOWN_MS } = require('../config');

const cooldowns = new Map();

function getRemainingCooldown(userId) {
  const expiresAt = cooldowns.get(userId) || 0;
  const remaining = expiresAt - Date.now();

  return Math.max(0, remaining);
}

function startCooldown(userId) {
  cooldowns.set(userId, Date.now() + COOLDOWN_MS);
}

function getCooldownCount() {
  const now = Date.now();

  for (const [userId, expiresAt] of cooldowns.entries()) {
    if (expiresAt <= now) {
      cooldowns.delete(userId);
    }
  }

  return cooldowns.size;
}

module.exports = {
  getCooldownCount,
  getRemainingCooldown,
  startCooldown
};
