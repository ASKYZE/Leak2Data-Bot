const db = require('../../Events/loadDatabase');
const config = require('../../config.json');

exports.help = {
  name: 'antispam',
  description: "Active ou désactive l'antispam",
  use: 'antispam on/off <message> <sous> <durée du timeout>\nExemple: antispam on 3 10s 1m \n(3 messages en 10 secondes, timeout de 1 minute)\nTemps: 1s, 1m, 1h, 1h (exemples)',
};

function parseTime(str) {
  const match = /^(\d+)(s|min|h|d)$/i.exec(str);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const ms = { s: 1000, min: 60000, h: 3600000, d: 86400000 };
  return { value: num, unit, ms: num * (ms[unit] || 1000) };
}

exports.run = async (bot, message, args) => {
  const checkperm = async (message, commandName) => {
    if (config.owners.includes(message.author.id)) {
      return true;
    }

const public = await new Promise((resolve, reject) => {
  db.get('SELECT statut FROM public WHERE guild = ? AND statut = ?', [message.guild.id, 'on'], (err, row) => {
    if (err) reject(err);
    resolve(!!row);
  });
});

if (public) {

  const publiccheck = await new Promise((resolve, reject) => {
    db.get(
      'SELECT command FROM cmdperm WHERE perm = ? AND command = ? AND guild = ?',
      ['public', commandName, message.guild.id],
      (err, row) => {
        if (err) reject(err);
        resolve(!!row);
      }
    );
  });

  if (publiccheck) {
    return true;
  }
}
    
    try {
      const userwl = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM whitelist WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (userwl) {
        return true;
      }

            const userowner = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM owner WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (userowner) {
        return true;
      }

      const userRoles = message.member.roles.cache.map(role => role.id);

      const permissions = await new Promise((resolve, reject) => {
        db.all('SELECT perm FROM permissions WHERE id IN (' + userRoles.map(() => '?').join(',') + ') AND guild = ?', [...userRoles, message.guild.id], (err, rows) => {
          if (err) reject(err);
          resolve(rows.map(row => row.perm));
        });
      });

      if (permissions.length === 0) {
        return false;
      }

      const cmdwl = await new Promise((resolve, reject) => {
        db.all('SELECT command FROM cmdperm WHERE perm IN (' + permissions.map(() => '?').join(',') + ') AND guild = ?', [...permissions, message.guild.id], (err, rows) => {
          if (err) reject(err);
          resolve(rows.map(row => row.command));
        });
      });

      return cmdwl.includes(commandName);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  };

  if (!(await checkperm(message, exports.help.name))) {
    const noacces = new EmbedBuilder()
    .setDescription("Vous n'avez pas la permission d'utiliser cette commande.")
    .setColor(config.color);
  return message.reply({embeds: [noacces], allowedMentions: { repliedUser: true }});
  }

  const guildId = message.guild.id;
  const status = args[0].toLowerCase() === 'on' ? 1 : 0;

  if (status === 0) {
  db.run(`INSERT INTO antiraid (guild, antispam)
          VALUES (?, ?)
          ON CONFLICT(guild) DO UPDATE SET antispam = ?`,
    [guildId, 0, 0], (err) => {
      if (err) return message.reply('Erreur lors de la mise à jour des paramètres.');
      message.reply("L'antispam a bien été désactivé.");
    });
  return;
}
  
  let count = parseInt(args[1]) || 3;
  let windowParsed = parseTime(args[2] || '10s');
if (!windowParsed) {
  return message.reply("Regarde +help antispam");
}
let sous = windowParsed.ms;
  let timeoutParsed = parseTime(args[3] || '1m');

if (!windowParsed) {
  return message.reply("Regarde +help antispam");
}
if (!timeoutParsed) {
  return message.reply("Regarde +help antispam");
}

  db.run(`INSERT INTO antiraid (guild, antispam, nombremessage, sous, timeout)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild) DO UPDATE SET antispam = ?, nombremessage = ?, sous = ?, timeout = ?`,
  [guildId, status, count, sous, timeoutParsed.ms, status, count, sous, timeoutParsed.ms], (err) => {
    if (err) return message.reply('Erreur lors de la mise à jour des paramètres.');

    const response = status ?
      `L'antispam a bien été activé.` :
      "L'antispam a bien été désactivé.";
    message.reply(response);
  });
};