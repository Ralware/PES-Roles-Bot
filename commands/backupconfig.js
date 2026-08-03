const path = require('node:path');
const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { createBackup } = require('../services/backupService');
const { replyWithError } = require('../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backupconfig')
    .setDescription('Back up roles, panel registry, and role configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const backupPath = createBackup(interaction.user.id, interaction.guildId);

      return interaction.reply({
        content: `\u2705 Configuration backup created:\n${path.basename(backupPath)}`,
        ephemeral: true
      });
    } catch (error) {
      return replyWithError(interaction, error, 'BACKUP_FAILED');
    }
  }
};
