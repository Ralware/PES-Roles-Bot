const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { auditGuild } = require('../services/validationService');
const { replyWithError } = require('../utils/errorHandler');

function summarize(items, formatter) {
  if (items.length === 0) {
    return 'None';
  }

  return items.slice(0, 10).map(formatter).join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auditroles')
    .setDescription('Audit self-role configuration, permissions, hierarchy, and panel status.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    try {
      const audit = await auditGuild(interaction.client, interaction.guild);
      const embed = new EmbedBuilder()
        .setTitle('Self-Role Audit')
        .addFields(
          {
            name: 'Missing Roles',
            value: summarize(audit.missingRoles, (role) => `${role.label} (${role.id || 'not configured'})`)
          },
          {
            name: 'Invalid Role IDs',
            value: summarize(audit.invalidRoleIds, (role) => `${role.label} (${role.id})`)
          },
          {
            name: 'Hierarchy Problems',
            value: summarize(audit.hierarchyProblems, (role) => `${role.label} (${role.id})`)
          },
          {
            name: 'Permission Problems',
            value: audit.permissionProblems.length ? audit.permissionProblems.join('\n') : 'None'
          },
          {
            name: 'Panel',
            value: `${audit.panel.status}${audit.panel.messageId ? `\nMessage ID: ${audit.panel.messageId}` : ''}`
          }
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      return replyWithError(interaction, error, 'AUDIT_FAILED');
    }
  }
};
