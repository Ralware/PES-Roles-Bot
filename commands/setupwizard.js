const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { createPanel, fetchStoredPanelMessage } = require('../services/panelService');
const { createMissingRoles } = require('../services/roleService');
const { auditGuild } = require('../services/validationService');
const { replyWithError } = require('../utils/errorHandler');
const { logEvent } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupwizard')
    .setDescription('Run full setup: permissions, roles, panel, hierarchy, and configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const beforeAudit = await auditGuild(interaction.client, interaction.guild);

      if (beforeAudit.permissionProblems.length > 0) {
        return interaction.editReply({
          content: `\u274C Missing permission(s): ${beforeAudit.permissionProblems.join(', ')}`
        });
      }

      const createdRoles = await createMissingRoles(interaction.guild, interaction.user.id);
      const activePanel = await fetchStoredPanelMessage(interaction.client, interaction.guildId);

      if (!activePanel.message) {
        await createPanel(interaction);
      }

      const afterAudit = await auditGuild(interaction.client, interaction.guild);

      if (afterAudit.hierarchyProblems.length > 0) {
        return interaction.editReply({
          content: '\u274C Roles were configured, but the bot role must be above all self-assignable roles.'
        });
      }

      logEvent(interaction.user.id, 'SETUP_WIZARD_COMPLETE', `Created roles: ${createdRoles.length}`, interaction.guildId);

      return interaction.editReply({
        content: '\u2705 Setup Complete'
      });
    } catch (error) {
      return replyWithError(interaction, error, 'SETUP_WIZARD_FAILED');
    }
  }
};
