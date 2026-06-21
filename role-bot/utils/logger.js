const fs = require('node:fs');
const path = require('node:path');

const logsDirectory = path.join(__dirname, '..', 'logs');
const logFile = path.join(logsDirectory, 'bot.jsonl');

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('-') + ' ' + [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join(':');
}

function logEvent(userId, action, result, guildId) {
  fs.mkdirSync(logsDirectory, { recursive: true });

  const entry = {
    timestamp: timestamp(),
    userId: userId || 'SYSTEM',
    action,
    result,
    guildId: guildId || null
  };

  fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`, 'utf8');
}

module.exports = {
  logEvent
};
