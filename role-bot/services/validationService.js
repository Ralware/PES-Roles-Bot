const { REQUIRED_BOT_PERMISSIONS, REQUIRED_ENV_VARS, getAllConfiguredRoles } = require('../config');
const { fetchStoredPanelMessage, repairStalePanels } = require('./panelService');
const { logEvent } = require('../utils/logger');

function validateEnvironment() {
  for (const variable of REQUIRED_ENV_VARS) {
    if (!process.env[variable]) {
      const message = `Missing required environment variable:\n${variable}`;
      console.error(message);
      logEvent('SYSTEM', 'STARTUP_FAILURE', message);
      process.exit(1);
    }
  }
}

async function auditGuild(client, guild) {
  const audit = {
    missingRoles: [],
    invalidRoleIds: [],
    hierarchyProblems: [],
    permissionProblems: [],
    panel: {
      exists: false,
      status: 'Missing',
      channelId: null,
      messageId: null
    },
    roleValidationStatus: 'Unknown'
  };

  await guild.roles.fetch();
  const botMember = await guild.members.fetchMe();

  for (const permission of REQUIRED_BOT_PERMISSIONS) {
    if (!botMember.permissions.has(permission.flag)) {
      audit.permissionProblems.push(permission.label);
    }
  }

  for (const roleOption of getAllConfiguredRoles()) {
    if (!roleOption.id || roleOption.id === 'ROLE_ID') {
      audit.missingRoles.push({ label: roleOption.label, id: roleOption.id || null });
      continue;
    }

    const role = await guild.roles.fetch(roleOption.id).catch(() => null);

    if (!role) {
      audit.invalidRoleIds.push({ label: roleOption.label, id: roleOption.id });
      continue;
    }

    if (role.position >= botMember.roles.highest.position) {
      audit.hierarchyProblems.push({ label: roleOption.label, id: role.id });
    }
  }

  const storedPanel = await fetchStoredPanelMessage(client, guild.id);
  if (storedPanel.message) {
    audit.panel = {
      exists: true,
      status: 'Active',
      channelId: storedPanel.panel.channelId,
      messageId: storedPanel.panel.messageId
    };
  } else if (storedPanel.panel) {
    audit.panel = {
      exists: false,
      status: 'Stale',
      channelId: storedPanel.panel.channelId,
      messageId: storedPanel.panel.messageId
    };
  }

  audit.roleValidationStatus = (
    audit.missingRoles.length === 0 &&
    audit.invalidRoleIds.length === 0 &&
    audit.hierarchyProblems.length === 0
  ) ? 'Valid' : 'Needs attention';

  return audit;
}

async function validateStartup(client) {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await repairStalePanels(client);

  const audit = await auditGuild(client, guild);

  for (const role of [...audit.missingRoles, ...audit.invalidRoleIds]) {
    const message = `Missing role:\n${role.label}\nRole ID: ${role.id || 'not configured'}`;
    console.error(message);
    logEvent('SYSTEM', 'STARTUP_ROLE_WARNING', message, guild.id);
  }

  if (audit.permissionProblems.length > 0) {
    for (const permission of audit.permissionProblems) {
      const message = `Bot is missing required permission:\n${permission}`;
      console.error(message);
      logEvent('SYSTEM', 'PERMISSION_FAILURE', message, guild.id);
    }

    throw new Error('Bot is missing required permissions.');
  }

  console.log('\u2713 Roles Validated');
  console.log('\u2713 Permissions Validated');

  if (audit.hierarchyProblems.length > 0) {
    for (const role of audit.hierarchyProblems) {
      logEvent('SYSTEM', 'STARTUP_FAILURE', `Hierarchy invalid for ${role.label} (${role.id})`, guild.id);
    }

    throw new Error('Bot role must be above all self-assignable roles.');
  }

  console.log('\u2713 Hierarchy Validated');
  return audit;
}

module.exports = {
  auditGuild,
  validateEnvironment,
  validateStartup
};
