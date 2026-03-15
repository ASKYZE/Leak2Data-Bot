const Discord = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../Events/loadDatabase');
const config = require('../../config.json');

exports.help = {
  name: 'tempvoc',
  sname: 'tempvoc <off/salon> <catégorie>',
  description: 'Permet de configurer le salon vocal temporaire',
  use: 'tempvoc <off/salon> <catégorie>',
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

  const errorEmbed = new EmbedBuilder()
    .setDescription(`Utilisation: ${config.prefix}tempvoc <salon> <catégorie id>\``)
    .setColor(config.color)

  let arg = message.content.trim().split(/ +/g);
  if (!arg[1] && args[0] && args[0].toLowerCase() === 'off') {
    db.run('DELETE FROM tempvoc WHERE guildId = ?', [message.guild.id], (err) => {
      if (err) return message.reply({ embeds: [errorEmbed.setDescription("Une erreur est survenue lors de la suppression de la configuration.")] });
      return message.reply({ embeds: [errorEmbed.setDescription("Les vocaux temporaire ont été supprimée.")] });
    });
    return;
  }

  if (!arg[1]) return message.reply({ embeds: [errorEmbed] });

  let channel = message.guild.channels.cache.get(args[0]) || message.mentions.channels.first();
  if (!channel) return message.reply({ embeds: [errorEmbed] });

  let categoryId = args[1];
  if (!categoryId) return message.reply({ embeds: [errorEmbed] });
  const category = message.guild.channels.cache.get(categoryId);
if (!category || category.type !== Discord.ChannelType.GuildCategory) {
  return message.reply({ embeds: [errorEmbed.setDescription("L'ID de catégorie n'est pas valide")] });
}
  

    db.get(`SELECT * FROM tempvoc WHERE guildId = ?`, [message.guild.id], (err, row) => {
      if (err) throw err;

      if (!row) {
        db.run(`INSERT INTO tempvoc (guildId, channel, category) VALUES (?, ?, ?)`, [message.guild.id, channel.id, categoryId]);
      } else {
        db.run(`UPDATE tempvoc SET channel = ? WHERE guildId = ?`, [channel.id, message.guild.id]);
        db.run(`UPDATE tempvoc SET category = ? WHERE guildId = ?`, [categoryId, message.guild.id]);
      }

      const embed = new EmbedBuilder()
        .setColor(config.color)
        .setDescription(`La vocal temporaire est configurée.\n> Catégorie: <#${categoryId}>\n> Salon: <#${channel.id}>`)
        .setTimestamp()

      message.channel.send({ embeds: [embed] });
    });
  };