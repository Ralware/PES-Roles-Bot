const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { fetchStoredPanelMessage } = require('../services/panelService');
const { replyWithError } = require('../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panelinfo')
    .setDescription('Show the registered role panel for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const { panel, channel, message } = await fetchStoredPanelMessage(interaction.client, interaction.guildId);

      if (!panel) {
        return interaction.reply({
          content: 'Channel:\nNot registered\n\nMessage ID:\nNot registered\n\nStatus:\nMissing',
          ephemeral: true
        });
      }

      return interaction.reply({
        content: [
          'Channel:',
          channel ? `<#${panel.channelId}>` : panel.channelId,
          '',
          'Message ID:',
          panel.messageId,
          '',
          'Status:',
          message ? 'Active' : 'Stale'
        ].join('\n'),
        ephemeral: true
      });
    } catch (error) {
      return replyWithError(interaction, error, 'PANEL_INFO_FAILED');
    }
  }
};
