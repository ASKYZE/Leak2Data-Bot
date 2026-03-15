const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../Events/loadDatabase'); 
const config = require('../../config.json');

exports.help = {
  name: 'roleinfo',
  description: "Affiche des informations sur un rôle",
  use: 'roleinfo <mention/id>',
};

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

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    
    if (!role) {
        return message.reply({ content: "Le rôle n'existe pas.", allowedMentions: { repliedUser: false } });
    }

    const memberCount = role.members.size;
    
    const embed = new EmbedBuilder()
        .setTitle(`Information sur le rôle`)
        .setColor(role.color || config.color)
        .addFields(
            { name: 'Nom', value: role.name, inline: true },
            { name: 'ID', value: role.id, inline: true },
            { name: 'Couleur', value: role.hexColor, inline: true },
            { name: 'Mention', value: role.mentionable ? 'Oui' : 'Non', inline: true },
            { name: 'Affiché séparément', value: role.hoist ? 'Oui' : 'Non', inline: true },
            { name: 'Nombre de membres', value: `${memberCount}`, inline: true },
            { name: 'Permissions', value: role.permissions.toArray().map(perm => PermissionsBitField.Flags[perm]).join(', ') || 'Aucune permission', inline: false }
        )
        .setFooter({ text: '4Protect V2' });

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
};
