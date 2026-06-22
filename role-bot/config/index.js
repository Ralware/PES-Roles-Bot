const { PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const roleIdsFallback = require('./roles');
const { readJson } = require('../utils/jsonStore');

const dataDirectory = path.join(__dirname, '..', 'data');
const roleConfigPath = path.join(dataDirectory, 'roleConfig.json');
const roleIdsPath = path.join(dataDirectory, 'roles.json');

const PANEL_EMBED_TITLE = 'Server Roles Selector';
const PANEL_MARKER = 'Choose Roles Below : ';
const SELF_ROLE_CUSTOM_ID_PREFIX = 'selfrole';
const COOLDOWN_MS = 0;

function toKey(label) {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getRoleKey(categoryKey, label) {
  const aliasMap = {
    campuses: {
      'RR Campus': 'rr',
      'EC Campus': 'ec'
    },
    departments: {
      CSE: 'cse',
      'CSE(AIML)': 'aiml',
      ECE: 'ece',
      MECH: 'mech',
      BBA: 'bba'
    }
  };

  return aliasMap[categoryKey]?.[String(label)] || (
    categoryKey === 'years' ? String(label) : toKey(label)
  );
}

function getStoredRoleId(categoryKey, key) {
  const roleIds = readJson(roleIdsPath, { campuses: {}, departments: {}, years: {} });

  return roleIds[categoryKey]?.[key] || roleIdsFallback[categoryKey]?.[key] || null;
}

function buildRoleOptions(categoryKey, labels) {
  return labels.map((label) => {
    const normalizedLabel = String(label);
    const key = getRoleKey(categoryKey, normalizedLabel);

    return {
      key,
      label: normalizedLabel,
      id: getStoredRoleId(categoryKey, key)
    };
  });
}

function getRoleCategories() {
  const roleConfig = readJson(roleConfigPath, {
    campuses: [],
    departments: [],
    years: []
  });

  return {
    campus: {
      label: 'Campus',
      placeholder: 'Select Campus',
      dataKey: 'campuses',
      roles: buildRoleOptions('campuses', roleConfig.campuses)
    },
    department: {
      label: 'Department',
      placeholder: 'Select Department',
      dataKey: 'departments',
      roles: buildRoleOptions('departments', roleConfig.departments)
    },
    year: {
      label: 'Joining Year',
      placeholder: 'Select Joining Year',
      dataKey: 'years',
      roles: buildRoleOptions('years', roleConfig.years)
    }
  };
}

const ROLE_CATEGORIES = getRoleCategories();

const REQUIRED_ENV_VARS = ['TOKEN', 'CLIENT_ID', 'GUILD_ID'];

const REQUIRED_BOT_PERMISSIONS = [
  { flag: PermissionFlagsBits.ManageRoles, label: 'Manage Roles' },
  { flag: PermissionFlagsBits.SendMessages, label: 'Send Messages' },
  { flag: PermissionFlagsBits.ViewChannel, label: 'View Channels' },
  { flag: PermissionFlagsBits.UseApplicationCommands, label: 'Use Slash Commands' },
  { flag: PermissionFlagsBits.ReadMessageHistory, label: 'Read Message History' }
];

function getAllConfiguredRoles() {
  return Object.values(getRoleCategories()).flatMap((category) => category.roles);
}

module.exports = {
  COOLDOWN_MS,
  PANEL_EMBED_TITLE,
  PANEL_MARKER,
  REQUIRED_BOT_PERMISSIONS,
  REQUIRED_ENV_VARS,
  ROLE_CATEGORIES,
  SELF_ROLE_CUSTOM_ID_PREFIX,
  getAllConfiguredRoles,
  getRoleCategories,
  getRoleKey,
  toKey
};
