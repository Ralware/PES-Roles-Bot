const path = require('node:path');
const { PermissionFlagsBits } = require('discord.js');
const { getRoleCategories, getRoleKey } = require('../config');
const { readJson, writeJson } = require('../utils/jsonStore');
const { logEvent } = require('../utils/logger');

const rolesPath = path.join(__dirname, '..', 'data', 'roles.json');

function getRoleIds() {
  return readJson(rolesPath, { campuses: {}, departments: {}, years: {} });
}

function saveRoleIds(roleIds) {
  writeJson(rolesPath, roleIds);
}

function getRoleOption(categoryKey, roleKey) {
  const category = getRoleCategories()[categoryKey];

  if (!category) {
    return { category: null, roleOption: null };
  }

  return {
    category,
    roleOption: category.roles.find((role) => role.key === roleKey || role.label === roleKey)
  };
}

async function fetchConfiguredRole(guild, roleOption) {
  if (!roleOption?.id || roleOption.id === 'ROLE_ID') {
    const error = new Error(`Missing configured role ID for ${roleOption?.label || 'unknown role'}`);
    error.code = 'MISSING_ROLE';
    error.roleLabel = roleOption?.label || 'unknown role';
    throw error;
  }

  const role = await guild.roles.fetch(roleOption.id).catch(() => null);

  if (!role) {
    const error = new Error(`Configured role does not exist: ${roleOption.label}`);
    error.code = 'MISSING_ROLE';
    error.roleLabel = roleOption.label;
    throw error;
  }

  return role;
}

function assertBotCanManageRole(botMember, role) {
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    const error = new Error('Bot is missing Manage Roles permission.');
    error.code = 'MISSING_PERMISSION';
    throw error;
  }

  if (role.position >= botMember.roles.highest.position) {
    const error = new Error('Bot role is not above assignable role.');
    error.code = 'ROLE_HIERARCHY';
    throw error;
  }
}

async function assignSelfRole(interaction, categoryKey, selectedRoleKey) {
  const { category, roleOption } = getRoleOption(categoryKey, selectedRoleKey);

  if (!category || !roleOption) {
    const error = new Error(`Unknown dropdown value: ${categoryKey}:${selectedRoleKey}`);
    error.code = 'UNKNOWN_DROPDOWN_VALUE';
    throw error;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const botMember = await interaction.guild.members.fetchMe();
  const selectedRole = await fetchConfiguredRole(interaction.guild, roleOption);

  assertBotCanManageRole(botMember, selectedRole);

  const categoryRoles = [];

  for (const option of category.roles) {
    categoryRoles.push({
      option,
      role: await fetchConfiguredRole(interaction.guild, option)
    });
  }

  for (const { role } of categoryRoles) {
    assertBotCanManageRole(botMember, role);
  }

  const rolesToRemove = categoryRoles
    .map(({ role }) => role)
    .filter((role) => role.id !== selectedRole.id && member.roles.cache.has(role.id));

  if (rolesToRemove.length > 0) {
    await member.roles.remove(rolesToRemove, `Self-role ${category.label} update`);

    for (const role of rolesToRemove) {
      logEvent(interaction.user.id, 'ROLE_REMOVAL', `Removed ${role.name} (${role.id})`, interaction.guildId);
    }
  }

  if (!member.roles.cache.has(selectedRole.id)) {
    await member.roles.add(selectedRole, `Self-role ${category.label} update`);
    logEvent(interaction.user.id, 'ROLE_ASSIGNMENT', `Added ${selectedRole.name} (${selectedRole.id})`, interaction.guildId);
  }

  return {
    categoryLabel: category.label,
    selectedRoleLabel: roleOption.label
  };
}

async function createMissingRoles(guild, userId = 'SYSTEM') {
  await guild.roles.fetch();

  const roleIds = getRoleIds();
  const created = [];
  const roleConfig = readJson(path.join(__dirname, '..', 'data', 'roleConfig.json'), {
    campuses: [],
    departments: [],
    years: []
  });
  const categories = [
    { dataKey: 'campuses', labels: roleConfig.campuses },
    { dataKey: 'departments', labels: roleConfig.departments },
    { dataKey: 'years', labels: roleConfig.years.map(String) }
  ];

  for (const category of categories) {
    roleIds[category.dataKey] ||= {};

    for (const label of category.labels) {
      const key = getRoleKey(category.dataKey, label);
      const storedId = roleIds[category.dataKey][key];
      const existingById = storedId ? await guild.roles.fetch(storedId).catch(() => null) : null;

      if (existingById) {
        continue;
      }

      const role = await guild.roles.create({
        name: String(label),
        reason: 'Self-role bot setup created missing role'
      });

      roleIds[category.dataKey][key] = role.id;
      created.push(role.name);
      logEvent(userId, 'ROLE_CREATE', `Created ${role.name} (${role.id})`, guild.id);
    }
  }

  saveRoleIds(roleIds);
  return created;
}

module.exports = {
  assignSelfRole,
  createMissingRoles,
  fetchConfiguredRole,
  getRoleIds,
  getRoleOption,
  saveRoleIds
};
