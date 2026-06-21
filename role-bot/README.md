# PESU Self-Role Discord Bot

A production-ready Discord.js v14 self-role bot for a university Discord server. Students choose one campus, one department, and one joining year using dropdown menus.

## Features

- `/setuproles` admin command with optional `create-missing`
- `/setupwizard` full setup flow
- One persistent role panel per server
- `/panelinfo`, `/refreshpanel`, `/deletepanel`
- `/auditroles` configuration audit
- `/health` runtime health check
- `/backupconfig` and `/restoreconfig`
- Dynamic role labels from `data/roleConfig.json`
- Role IDs stored in `data/roles.json`
- Panel registry stored in `data/panels.json`
- JSONL logs in `logs/bot.jsonl`
- 5-second per-user dropdown cooldown
- Startup validation and stale panel auto-repair

## Installation

Install Node.js 18 or newer, then run:

```bash
npm install
```

If PowerShell blocks `npm`, use:

```powershell
npm.cmd install
```

## Environment Variables

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Fill in:

```env
TOKEN=your_bot_token_here
CLIENT_ID=1518275097461526649
GUILD_ID=1517039187839160410
```

The bot exits immediately if `TOKEN`, `CLIENT_ID`, or `GUILD_ID` is missing.

## Dynamic Role Configuration

Edit role labels in:

```text
data/roleConfig.json
```

Default:

- Campuses: `RR Campus`, `EC Campus`
- Departments: `CSE`, `CSE(AIML)`, `ECE`, `MECH`
- Years: `2015` through `2030`

Role IDs are stored in:

```text
data/roles.json
```

You can fill IDs manually, or let the bot create/store them automatically.

## Recommended Setup

Deploy slash commands:

```bash
node deploy-commands.js
```

Start the bot:

```bash
node index.js
```

In the Discord channel where the panel should appear, run:

```text
/setupwizard
```

The wizard verifies permissions, creates missing roles, creates the role panel, validates hierarchy, and saves configuration.

## Manual Panel Setup

Create missing roles and post the panel:

```text
/setuproles create-missing: true
```

Post the panel using existing configured role IDs:

```text
/setuproles
```

Only one panel is allowed per server. If a panel already exists, the bot replies:

```text
❌ Role panel already exists.

Use /panelinfo or /refreshpanel.
```

## Panel Management Commands

Show the registered panel:

```text
/panelinfo
```

Refresh dropdowns while preserving the same message ID:

```text
/refreshpanel
```

Delete the panel message and remove the registry entry:

```text
/deletepanel
```

Panel registry is stored in:

```text
data/panels.json
```

If startup finds a registry entry pointing to a deleted message, it removes the stale reference and continues.

## Monitoring and Audits

Audit roles, role IDs, hierarchy, permissions, and panel status:

```text
/auditroles
```

Show runtime health:

```text
/health
```

Health includes:

- Guild count
- Uptime
- Memory usage
- Panel status
- Role validation status
- Active cooldown count

## Backup and Restore

Create a timestamped backup:

```text
/backupconfig
```

Restore the latest backup:

```text
/restoreconfig
```

Backups are written to:

```text
backups/
```

Each backup contains:

- `data/roles.json`
- `data/panels.json`
- `data/roleConfig.json`

## Bot Permissions

The bot role must have:

- Manage Roles
- Send Messages
- View Channels
- Use Slash Commands
- Read Message History

The bot role must be above every self-assignable role.

## Logs

Logs are written as JSONL:

```text
logs/bot.jsonl
```

Example entry:

```json
{"timestamp":"2026-06-21 14:30:15","userId":"123","action":"ROLE_ASSIGNMENT","result":"Added CSE (456)","guildId":"1517039187839160410"}
```

## Run with PM2

```bash
npm install -g pm2
pm2 start index.js --name pesu-role-bot
pm2 save
pm2 logs pesu-role-bot
```

Restart:

```bash
pm2 restart pesu-role-bot
```

Stop:

```bash
pm2 stop pesu-role-bot
```

## Startup Output

Successful startup prints:

```text
✓ Commands Loaded
✓ Roles Validated
✓ Permissions Validated
✓ Hierarchy Validated
✓ Ready
```

Missing role IDs are logged as warnings so `/setupwizard` or `/setuproles create-missing: true` can repair them.

## Migration Notes

Older `config/roles.js` IDs still work for the original default role keys (`rr`, `ec`, `cse`, `aiml`, `ece`, `mech`, and years). New automatically created IDs are stored in `data/roles.json`.

For best results, run:

```text
/backupconfig
/setupwizard
/auditroles
```

## Troubleshooting

### Slash commands do not appear

Run:

```bash
node deploy-commands.js
```

Then wait a few seconds or restart Discord.

### The bot cannot create roles

Give the bot `Manage Roles`, then make sure the bot role is high enough in Server Settings > Roles.

### The panel says it already exists

Run:

```text
/panelinfo
```

Then use `/refreshpanel` or `/deletepanel`.

### Role assignment fails

Run:

```text
/auditroles
```

Fix missing role IDs, invalid role IDs, missing permissions, or hierarchy problems.

### Restore did not change visible dropdown labels

Run:

```text
/refreshpanel
```

This rebuilds the existing panel from `data/roleConfig.json`.
