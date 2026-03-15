const Discord = require('discord.js');
const db = require('../../Events/loadDatabase');
const config = require('../../config.json');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

exports.help = {
  name: 'captcha',
  sname: 'captcha [role]',
  description: 'Permet de configurer/envoyer le captcha',
  use: 'captcha [role]'
};

exports.run = async (bot, message, args, config) => {
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

    if (args[0]) {
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    if (!role) {
      return message.reply("Rôle invalide ou introuvable.");
    }

    db.run(`CREATE TABLE IF NOT EXISTS captcha (guild TEXT PRIMARY KEY, id TEXT)`, [], (err) => {
      if (err) {
        console.error(err);
      }
      db.run(`INSERT OR REPLACE INTO captcha (guild, id) VALUES (?, ?)`, [message.guild.id, role.id], (err) => {
        if (err) {
          console.error(err);
        }
        message.reply(`Le rôle captcha a bien été configuré.`);
      });
    });
    return;
  }

  db.get('SELECT id FROM captcha WHERE guild = ?', [message.guild.id], async (err, row) => {
    if (err) {
      console.error(err);
    }
    if (!row) {
      return message.reply("Utilisez captcha <role> pour configurer le role.");
    }

    const roleId = row.id;

    const vrf = new EmbedBuilder()
  .setTitle(config.ctitre)
  .setDescription(config.cdescription)
  .setColor(config.ccolor);

if (config.cimage && config.cimage.trim() !== '') {
  vrf.setImage(config.cimage);
}

const button = new ButtonBuilder()
  .setCustomId('cbutton')
  .setStyle(ButtonStyle.Secondary)
  .setEmoji(config.cemoji);

const arw = new ActionRowBuilder().addComponents(button);

await message.channel.send({ embeds: [vrf], components: [arw] });

  });
};