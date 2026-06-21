const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { deletePanel } = require('../services/panelService');
const { replyWithError } = require('../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletepanel')
    .setDescription('Delete the registered role panel and clear the registry.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      await deletePanel(interaction);

      return interaction.reply({
        content: '\u2705 Role panel removed.',
        ephemeral: true
      });
    } catch (error) {
      return replyWithError(interaction, error, 'PANEL_DELETE_FAILED');
    }
  }
};
