const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { buildHealthEmbed } = require('../services/healthService');
const { replyWithError } = require('../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('Show bot health and self-role service status.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const embed = await buildHealthEmbed(interaction.client, interaction.guild);

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      return replyWithError(interaction, error, 'HEALTH_FAILED');
    }
  }
};
