const path = require('node:path');
const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { restoreLatestBackup } = require('../services/backupService');
const { replyWithError } = require('../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restoreconfig')
    .setDescription('Restore the latest configuration backup.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const backupPath = restoreLatestBackup(interaction.user.id, interaction.guildId);

      return interaction.reply({
        content: `\u2705 Configuration restored from:\n${path.basename(backupPath)}`,
        ephemeral: true
      });
    } catch (error) {
      return replyWithError(interaction, error, 'RESTORE_FAILED');
    }
  }
};
