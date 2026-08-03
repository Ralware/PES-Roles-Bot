const path = require('node:path');
const { PermissionFlagsBits } = require('discord.js');
const { getRoleCategories } = require('../config');
const { readJson, writeJson } = require('../utils/jsonStore');
const { logEvent } = require('../utils/logger');

const rolesPath = path.join(__dirname, '..', 'data', 'roles.json');

function getRoleIds() {
  return readJson(rolesPath, { campuses: {}, departments: {}, years: {}, extras: {} });
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

async function getCategoryRoles(guild, category) {
  const categoryRoles = [];

  for (const option of category.roles) {
    categoryRoles.push({
      option,
      role: await fetchConfiguredRole(guild, option)
    });
  }

  return categoryRoles;
}

function findCurrentRolesInCategory(member, categoryRoles) {
  return categoryRoles.filter(({ role }) => member.roles.cache.has(role.id));
}

async function removeCategoryRoles(member, categoryLabel, categoryRoles, interaction) {
  if (categoryRoles.length === 0) {
    return;
  }

  const roles = categoryRoles.map(({ role }) => role);
  await member.roles.remove(roles, `Self-role ${categoryLabel} update`);

  for (const role of roles) {
    logEvent(interaction.user.id, 'ROLE_REMOVAL', `Removed ${role.name} (${role.id})`, interaction.guildId);
  }
}

async function swapCategoryRole(member, category, selectedRole, currentRoles, interaction) {
  await removeCategoryRoles(member, category.label, currentRoles, interaction);
  await member.roles.add(selectedRole, `Self-role ${category.label} update`);
  logEvent(interaction.user.id, 'ROLE_ASSIGNMENT', `Added ${selectedRole.name} (${selectedRole.id})`, interaction.guildId);
}

async function toggleSingleSelectionRole(member, botMember, category, selectedRole, interaction) {
  const categoryRoles = await getCategoryRoles(interaction.guild, category);

  for (const { role } of categoryRoles) {
    assertBotCanManageRole(botMember, role);
  }

  const currentRoles = findCurrentRolesInCategory(member, categoryRoles);
  const selectedRoleIsAssigned = currentRoles.some(({ role }) => role.id === selectedRole.id);

  if (selectedRoleIsAssigned) {
    await removeCategoryRoles(member, category.label, currentRoles, interaction);
    return 'removed';
  }

  await swapCategoryRole(member, category, selectedRole, currentRoles, interaction);
  return 'added';
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

  if (!category.exclusive && member.roles.cache.has(selectedRole.id)) {
    await member.roles.remove(selectedRole, `Self-role ${category.label} update`);
    logEvent(interaction.user.id, 'ROLE_REMOVAL', `Removed ${selectedRole.name} (${selectedRole.id})`, interaction.guildId);

    return {
      categoryLabel: category.label,
      selectedRoleLabel: roleOption.label,
      action: 'removed'
    };
  }

  if (category.exclusive) {
    const action = await toggleSingleSelectionRole(member, botMember, category, selectedRole, interaction);

    return {
      categoryLabel: category.label,
      selectedRoleLabel: roleOption.label,
      action
    };
  }

  if (!member.roles.cache.has(selectedRole.id)) {
    await member.roles.add(selectedRole, `Self-role ${category.label} update`);
    logEvent(interaction.user.id, 'ROLE_ASSIGNMENT', `Added ${selectedRole.name} (${selectedRole.id})`, interaction.guildId);
  }

  return {
    categoryLabel: category.label,
    selectedRoleLabel: roleOption.label,
    action: 'added'
  };
}

async function createMissingRoles(guild, userId = 'SYSTEM') {
  await guild.roles.fetch();

  const roleIds = getRoleIds();
  const created = [];
  const categories = Object.values(getRoleCategories());

  for (const category of categories) {
    roleIds[category.dataKey] ||= {};

    for (const option of category.roles) {
      const storedId = roleIds[category.dataKey][option.key];
      const existingById = storedId ? await guild.roles.fetch(storedId).catch(() => null) : null;

      if (existingById) {
        continue;
      }

      const role = await guild.roles.create({
        name: option.label,
        reason: 'Self-role bot setup created missing role'
      });

      roleIds[category.dataKey][option.key] = role.id;
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
  findCurrentRolesInCategory,
  getCategoryRoles,
  getRoleIds,
  getRoleOption,
  removeCategoryRoles,
  saveRoleIds,
  swapCategoryRole,
  toggleSingleSelectionRole
};
