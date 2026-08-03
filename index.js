require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { logEvent } = require('./utils/logger');
const { validateEnvironment, validateStartup } = require('./services/validationService');

validateEnvironment();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARNING] Command at ${filePath} is missing "data" or "execute".`);
  }
}

console.log('\u2713 Commands Loaded');

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.once('ready', async () => {
  try {
    await validateStartup(client);
    console.log('\u2713 Ready');
    console.log(`Logged in as ${client.user.tag}`);
    logEvent('SYSTEM', 'STARTUP', `Ready as ${client.user.tag}`);
  } catch (error) {
    console.error('Startup validation failed:', error.message);
    logEvent('SYSTEM', 'STARTUP_FAILURE', error.message);
    process.exit(1);
  }
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  logEvent('SYSTEM', 'UNHANDLED_REJECTION', error?.message || String(error));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  logEvent('SYSTEM', 'UNCAUGHT_EXCEPTION', error?.message || String(error));
});

client.login(process.env.TOKEN);
