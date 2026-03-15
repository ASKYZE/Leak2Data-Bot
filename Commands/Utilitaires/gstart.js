const { EmbedBuilder, Invite } = require('discord.js');
const db = require('../../Events/loadDatabase');
const config = require('../../config.json');
const ms = require('ms');

exports.help = {
  name: 'gstart',
  sname: 'gstart',
  description: 'Permet de créer un giveaway',
  use: 'gstart <durée> <gagnant> <prix>'
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

  let embed = new EmbedBuilder()
    .setDescription(`${bot.prefix}gstart <>durée> <gagnant> <prix>`)
    .setColor(config.color)

  if (!args[0] || !args[1] || !args[2]) return message.reply({ embeds: [embed] });

  let duration = args[0];
  if (!duration || isNaN(ms(duration))) return message.reply({ embeds: [embed] });

  let winnerCount = parseInt(args[1]);
  if (isNaN(winnerCount) || winnerCount <= 0) return message.reply({ embeds: [embed] });

  let prize = args.slice(2).join(" ");
  if (!prize) return message.reply({ embeds: [embed] });

  await message.delete();

  bot.giveawaysManager.start(message.channel, {
    duration: ms(duration),
    winnerCount: winnerCount,
    prize: prize,
    hostedBy: message.author,
    messages: {
      giveaway: '',
      giveawayEnded: '',
      drawing: 'Fin dans: {timestamp}',
      inviteToParticipate: '',
      timeRemaining: `Temps restant: **{duration}**`,
      winMessage: `🎉 Félicitations, {winners} a gagné **${prize}**!`,
      noWinner: "Giveaway annulé, aucun participant valide.",
      hostedBy: `Organisé par: ${message.author}`,
      noWinner: 'Pas assez de participant',
      winners: "Gagnant(s)",
      endedAt: "Terminé",
      embedFooter: 'Termine',
    }
  });
};