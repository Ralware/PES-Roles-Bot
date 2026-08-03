const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { refreshPanel } = require('../services/panelService');
const { replyWithError } = require('../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshpanel')
    .setDescription('Refresh the existing role panel without changing its message ID.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      await refreshPanel(interaction);

      return interaction.reply({
        content: '\u2705 Role panel refreshed.',
        ephemeral: true
      });
    } catch (error) {
      return replyWithError(interaction, error, 'PANEL_REFRESH_FAILED');
    }
  }
};
