const fs = require('node:fs');
const path = require('node:path');
const { readJson, writeJson } = require('../utils/jsonStore');
const { logEvent } = require('../utils/logger');

const root = path.join(__dirname, '..');
const backupsDirectory = path.join(root, 'backups');

const files = {
  roles: path.join(root, 'data', 'roles.json'),
  panels: path.join(root, 'data', 'panels.json'),
  roleConfig: path.join(root, 'data', 'roleConfig.json')
};

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function createBackup(userId, guildId) {
  fs.mkdirSync(backupsDirectory, { recursive: true });

  const backup = {
    createdAt: new Date().toISOString(),
    roles: readJson(files.roles, {}),
    panels: readJson(files.panels, {}),
    roleConfig: readJson(files.roleConfig, {})
  };

  const backupPath = path.join(backupsDirectory, `config-backup-${timestampForFile()}.json`);
  writeJson(backupPath, backup);
  logEvent(userId, 'BACKUP_CREATE', backupPath, guildId);

  return backupPath;
}

function getLatestBackup() {
  if (!fs.existsSync(backupsDirectory)) {
    return null;
  }

  const files = fs.readdirSync(backupsDirectory)
    .filter((file) => file.startsWith('config-backup-') && file.endsWith('.json'))
    .map((file) => path.join(backupsDirectory, file))
    .sort();

  return files.at(-1) || null;
}

function restoreLatestBackup(userId, guildId) {
  const backupPath = getLatestBackup();

  if (!backupPath) {
    const error = new Error('No backup file exists.');
    error.code = 'BACKUP_MISSING';
    throw error;
  }

  const backup = readJson(backupPath, null);

  if (!backup?.roles || !backup?.panels || !backup?.roleConfig) {
    const error = new Error('Latest backup is invalid.');
    error.code = 'BACKUP_INVALID';
    throw error;
  }

  writeJson(files.roles, backup.roles);
  writeJson(files.panels, backup.panels);
  writeJson(files.roleConfig, backup.roleConfig);
  logEvent(userId, 'BACKUP_RESTORE', backupPath, guildId);

  return backupPath;
}

module.exports = {
  createBackup,
  getLatestBackup,
  restoreLatestBackup
};
