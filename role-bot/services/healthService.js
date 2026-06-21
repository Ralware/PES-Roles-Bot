const { EmbedBuilder } = require('discord.js');
const { auditGuild } = require('./validationService');
const { getCooldownCount } = require('../utils/cooldown');

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
}

async function buildHealthEmbed(client, guild) {
  const audit = await auditGuild(client, guild);
  const memory = process.memoryUsage();

  return new EmbedBuilder()
    .setTitle('Bot Health')
    .addFields(
      { name: 'Guild Count', value: String(client.guilds.cache.size), inline: true },
      { name: 'Uptime', value: formatUptime(process.uptime()), inline: true },
      { name: 'Memory Usage', value: `${Math.round(memory.rss / 1024 / 1024)} MB RSS`, inline: true },
      { name: 'Panel Status', value: audit.panel.status, inline: true },
      { name: 'Role Validation Status', value: audit.roleValidationStatus, inline: true },
      { name: 'Cooldown Count', value: String(getCooldownCount()), inline: true }
    );
}

module.exports = {
  buildHealthEmbed
};
