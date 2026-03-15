const Discord = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const db = require('../../Events/loadDatabase');
const config = require('../../config.json');

exports.help = {
  name: 'setconfess',
  sname: 'setconfess <salon/off>',
  description: 'Permet de configurer le salon de confess',
  use: 'setconfess <salon/off>',
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

  const arg = message.content.trim().split(/ +/g);
  const embed1 = new EmbedBuilder()
    .setDescription(`Use: ${config.prefix}confess <salon/off>`)
    .setColor(config.color)
  const embed2 = new EmbedBuilder()
    .setDescription(`<@${message.author.id}>, le salon est déjà désactivé`)
    .setColor(config.color)
  const embed3 = new EmbedBuilder()
    .setDescription(`<@${message.author.id}>, le salon est déjà configuré sur ce salon`)
    .setColor(config.color)
  const embed4 = new EmbedBuilder()
    .setDescription(`<@${message.author.id}>, le salon a bien été désactivé !`)
    .setColor(config.color)
  const embed5 = new EmbedBuilder()
    .setDescription(`<@${message.author.id}>, le salon des confesss a bien été activé`)
    .setColor(config.color)

  if (!arg[1]) return message.reply({ embeds: [embed1] });

  const off = 'off';

  if (arg[1].toLowerCase() === "off") {
    db.get(`SELECT channel FROM Confess WHERE guildId = ?`, [message.guild.id], (err, row) => {
      if (err) throw err;

      if (!row) {
        db.run(`INSERT INTO Confess (guildId, channel) VALUES (?, ?)`, [message.guild.id, off]);
        return message.channel.send({ embeds: [embed4] });
      } else {
        if (row.channel === off) return message.channel.send({ embeds: [embed2] });

        db.run(`UPDATE Confess SET channel = ? WHERE guildId = ?`, [off, message.guild.id]);
        return message.channel.send({ embeds: [embed4] });
      }
    });
  } else {
    const channelId = arg[1].replace("<#", "").replace(">", "");
    const channel = message.guild.channels.cache.get(channelId);

    if (!channel || !channel.name) {
      return message.channel.send({ embeds: [embed1.setDescription(`<@${message.author.id}>, le salon est invalide `)] });
    }

    db.get(`SELECT channel FROM Confess WHERE guildId = ?`, [message.guild.id], (err, row) => {
      if (err) throw err;

      if (!row) {
  db.run(`INSERT INTO Confess (guildId, channel) VALUES (?, ?)`, [message.guild.id, channelId], () => {
    message.channel.send({ embeds: [embed5] });

    const confessChannel = message.guild.channels.cache.get(channelId);
    if (confessChannel) {
      let confessionNumber = 1;
      db.get('SELECT COUNT(*) as count FROM confesslogs WHERE guildId = ?', [message.guild.id], (err2, row2) => {
        if (!err2 && row2) confessionNumber = row2.count + 1;

        const embed = new EmbedBuilder()
          .setTitle(`Confession`)
          .setDescription('Clique sur le bouton ci-dessous pour te confesser')
          .setColor(config.color);

        const rowBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confess_open')
            .setLabel('Se confesser')
            .setStyle(ButtonStyle.Primary)
        );

        confessChannel.send({ embeds: [embed], components: [rowBtn] });
      });
    }
  });
} else {
  if (row.channel === channelId) return message.channel.send({ embeds: [embed3] });

  db.run(`UPDATE Confess SET channel = ? WHERE guildId = ?`, [channelId, message.guild.id], () => {
    message.channel.send({ embeds: [embed5] });

    const confessChannel = message.guild.channels.cache.get(channelId);
    if (confessChannel) {
      let confessionNumber = 1;
      db.get('SELECT COUNT(*) as count FROM confesslogs WHERE guildId = ?', [message.guild.id], (err2, row2) => {
        if (!err2 && row2) confessionNumber = row2.count + 1;

        const embed = new EmbedBuilder()
          .setTitle(`Confession`)
          .setDescription('Clique sur le bouton ci-dessous pour te confesser')
          .setColor(config.color);

        const rowBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confess_open')
            .setLabel('Se confesser')
            .setStyle(ButtonStyle.Primary)
        );

        confessChannel.send({ embeds: [embed], components: [rowBtn] });
                  });
          }
        });
      }
    });
  }
};