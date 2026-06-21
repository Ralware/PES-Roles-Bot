const path = require('node:path');
const {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const {
  PANEL_EMBED_TITLE,
  PANEL_MARKER,
  getRoleCategories,
  SELF_ROLE_CUSTOM_ID_PREFIX
} = require('../config');
const { readJson, writeJson } = require('../utils/jsonStore');
const { logEvent } = require('../utils/logger');

const panelsPath = path.join(__dirname, '..', 'data', 'panels.json');

function getPanelRegistry() {
  return readJson(panelsPath, {});
}

function savePanelRegistry(registry) {
  writeJson(panelsPath, registry);
}

function getStoredPanel(guildId) {
  return getPanelRegistry()[guildId] || null;
}

function savePanel(guildId, channelId, messageId) {
  const registry = getPanelRegistry();
  registry[guildId] = { channelId, messageId };
  savePanelRegistry(registry);
}

function removePanel(guildId) {
  const registry = getPanelRegistry();
  delete registry[guildId];
  savePanelRegistry(registry);
}

function buildRolePanelPayload() {
  const embed = new EmbedBuilder()
    .setTitle(PANEL_EMBED_TITLE)
    .setDescription('Use the dropdown menus below to choose your campus, department, and joining year.')
    .setFooter({ text: PANEL_MARKER });

  const components = Object.entries(getRoleCategories()).map(([categoryKey, category]) =>
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${SELF_ROLE_CUSTOM_ID_PREFIX}:${categoryKey}`)
        .setPlaceholder(category.placeholder)
        .addOptions(
          category.roles.map((role) => ({
            label: role.label,
            value: role.key
          }))
        )
    )
  );

  return { embeds: [embed], components };
}

async function fetchStoredPanelMessage(client, guildId) {
  const panel = getStoredPanel(guildId);

  if (!panel) {
    return { panel: null, channel: null, message: null };
  }

  const channel = await client.channels.fetch(panel.channelId).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    return { panel, channel: null, message: null };
  }

  const message = await channel.messages.fetch(panel.messageId).catch(() => null);

  return { panel, channel, message };
}

async function createPanel(interaction) {
  const { message } = await fetchStoredPanelMessage(interaction.client, interaction.guildId);

  if (message) {
    const error = new Error('Role panel already exists.');
    error.code = 'PANEL_EXISTS';
    throw error;
  }

  if (getStoredPanel(interaction.guildId)) {
    removePanel(interaction.guildId);
    logEvent(interaction.user.id, 'PANEL_STALE_REFERENCE_REMOVED', 'Deleted stale panel reference.', interaction.guildId);
  }

  const panelMessage = await interaction.channel.send(buildRolePanelPayload());
  savePanel(interaction.guildId, interaction.channelId, panelMessage.id);
  logEvent(interaction.user.id, 'SETUP_PANEL_CREATION', `Created panel ${panelMessage.id}`, interaction.guildId);

  return panelMessage;
}

async function refreshPanel(interaction) {
  const { message } = await fetchStoredPanelMessage(interaction.client, interaction.guildId);

  if (!message) {
    removePanel(interaction.guildId);
    const error = new Error('No active role panel exists.');
    error.code = 'PANEL_MISSING';
    throw error;
  }

  await message.edit(buildRolePanelPayload());
  logEvent(interaction.user.id, 'PANEL_REFRESH', `Refreshed panel ${message.id}`, interaction.guildId);

  return message;
}

async function deletePanel(interaction) {
  const { message, panel } = await fetchStoredPanelMessage(interaction.client, interaction.guildId);

  if (message) {
    await message.delete();
  }

  if (panel) {
    removePanel(interaction.guildId);
  }

  logEvent(interaction.user.id, 'PANEL_DELETE', panel ? `Removed panel ${panel.messageId}` : 'No panel stored', interaction.guildId);
}

async function repairStalePanels(client) {
  const registry = getPanelRegistry();

  for (const [guildId, panel] of Object.entries(registry)) {
    const { message } = await fetchStoredPanelMessage(client, guildId);

    if (!message) {
      delete registry[guildId];
      logEvent('SYSTEM', 'PANEL_STALE_REFERENCE_REMOVED', 'Deleted stale panel reference.', guildId);
      console.log('Deleted stale panel reference.');
    }
  }

  savePanelRegistry(registry);
}

module.exports = {
  buildRolePanelPayload,
  createPanel,
  deletePanel,
  fetchStoredPanelMessage,
  getPanelRegistry,
  getStoredPanel,
  refreshPanel,
  removePanel,
  repairStalePanels,
  savePanel
};
