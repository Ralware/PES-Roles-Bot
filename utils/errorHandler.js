const { DiscordAPIError } = require('discord.js');
const { logEvent } = require('./logger');

function getUserErrorMessage(error) {
  if (error?.code === 'UNKNOWN_DROPDOWN_VALUE') {
    return '\u274C Invalid role selection.';
  }

  if (error?.code === 'PANEL_EXISTS') {
    return '\u274C Role panel already exists.\n\nUse /panelinfo or /refreshpanel.';
  }

  if (error?.code === 'PANEL_MISSING') {
    return '\u274C No active role panel is registered for this server.';
  }

  if (error?.code === 'BACKUP_MISSING') {
    return '\u274C No backup file exists yet.';
  }

  if (error?.code === 'BACKUP_INVALID') {
    return '\u274C The latest backup file is invalid.';
  }

  if (error?.code === 'MISSING_ROLE') {
    return `\u274C Missing role: ${error.roleLabel}. Please ask an admin to check the role configuration.`;
  }

  if (error?.code === 'ROLE_HIERARCHY') {
    return '\u274C Bot role must be above all self-assignable roles.';
  }

  if (error?.code === 'MISSING_PERMISSION' || error?.code === 50013) {
    return '\u274C I do not have permission to manage one or more of those roles.';
  }

  if (error?.code === 10011) {
    return '\u274C One of the configured roles no longer exists.';
  }

  if (error instanceof DiscordAPIError) {
    return '\u274C Discord could not update your roles right now. Please try again later.';
  }

  if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT'].includes(error?.code)) {
    return '\u274C Network trouble stopped the role update. Please try again later.';
  }

  return '\u274C Something went wrong. Please try again later.';
}

async function replyWithError(interaction, error, action = 'ERROR') {
  const content = getUserErrorMessage(error);

  console.error(action, error);
  logEvent(interaction?.user?.id, action, content);

  const payload = { content, ephemeral: true };

  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(payload);
    }

    return await interaction.reply(payload);
  } catch (replyError) {
    console.error('Failed to send error response:', replyError);
    logEvent(interaction?.user?.id, 'ERROR_RESPONSE_FAILED', replyError.message);
    return undefined;
  }
}

module.exports = {
  getUserErrorMessage,
  replyWithError
};
