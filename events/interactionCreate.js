const { Events } = require('discord.js');
const { SELF_ROLE_CUSTOM_ID_PREFIX } = require('../config');
const { getRemainingCooldown, startCooldown } = require('../utils/cooldown');
const { replyWithError } = require('../utils/errorHandler');
const { assignSelfRole } = require('../services/roleService');
const { refreshSelectMenus } = require('../services/panelService');

async function handleSlashCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    return interaction.reply({
      content: '\u274C This command is not available.',
      ephemeral: true
    });
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    await replyWithError(interaction, error, `COMMAND_FAILURE:/${interaction.commandName}`);
  }
}

async function handleSelfRoleSelect(interaction) {
  const [, categoryKey] = interaction.customId.split(':');
  const selectedRoleKey = interaction.values[0];

  if (getRemainingCooldown(interaction.user.id) > 0) {
    await refreshSelectMenus(interaction).catch(console.error);
    return interaction.reply({
      content: 'Please wait a few seconds before changing roles again.',
      ephemeral: true
    });
  }

  startCooldown(interaction.user.id);

  let result;
  let assignmentError;

  try {
    result = await assignSelfRole(interaction, categoryKey, selectedRoleKey);
  } catch (error) {
    assignmentError = error;
  }

  await refreshSelectMenus(interaction).catch(console.error);

  if (assignmentError) {
    return replyWithError(interaction, assignmentError, 'SELF_ROLE_UPDATE_FAILED');
  }

  return interaction.reply({
    content: result.action === 'removed'
      ? `\u2796 Removed ${result.selectedRoleLabel} from your roles`
      : `\u2705 Added ${result.selectedRoleLabel} to your roles`,
    ephemeral: true
  });
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      return handleSlashCommand(interaction);
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith(`${SELF_ROLE_CUSTOM_ID_PREFIX}:`)
    ) {
      return handleSelfRoleSelect(interaction);
    }

    return undefined;
  }
};
