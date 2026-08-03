const {
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const { REQUIRED_BOT_PERMISSIONS } = require('../config');
const { replyWithError } = require('../utils/errorHandler');
const { logEvent } = require('../utils/logger');
const { createPanel, fetchStoredPanelMessage, removePanel } = require('../services/panelService');
const { createMissingRoles } = require('../services/roleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuproles')
    .setDescription('Post the student self-role selection menus.')
    .addBooleanOption((option) =>
      option
        .setName('create-missing')
        .setDescription('Create missing configured roles before posting the panel.')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '\u274C This command can only be used inside a server.',
        ephemeral: true
      });
    }

    const me = await interaction.guild.members.fetchMe();
    const missingPermissions = REQUIRED_BOT_PERMISSIONS.filter(
      (permission) => !interaction.channel.permissionsFor(me)?.has(permission.flag)
    );

    if (missingPermissions.length > 0) {
      const missingLabels = missingPermissions.map((permission) => permission.label).join(', ');
      logEvent(interaction.user.id, 'PERMISSION_FAILURE', `Missing channel permissions: ${missingLabels}`, interaction.guildId);

      return interaction.reply({
        content: `\u274C I am missing these channel permissions: ${missingLabels}.`,
        ephemeral: true
      });
    }

    try {
      const storedPanel = await fetchStoredPanelMessage(interaction.client, interaction.guildId);

      if (storedPanel.message) {
        return interaction.reply({
          content: '\u274C Role panel already exists.\n\nUse /panelinfo or /refreshpanel.',
          ephemeral: true
        });
      }

      if (storedPanel.panel) {
        removePanel(interaction.guildId);
        logEvent(interaction.user.id, 'PANEL_STALE_REFERENCE_REMOVED', 'Deleted stale panel reference.', interaction.guildId);
      }
    } catch (error) {
      return replyWithError(interaction, error, 'PANEL_DUPLICATE_CHECK_FAILED');
    }

    try {
      if (interaction.options.getBoolean('create-missing') === true) {
        await createMissingRoles(interaction.guild, interaction.user.id);
      }

      await createPanel(interaction);

      return interaction.reply({
        content: '\u2705 Role selection message posted.',
        ephemeral: true
      });
    } catch (error) {
      return replyWithError(interaction, error, 'SETUP_PANEL_CREATION_FAILED');
    }
  }
};
