const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../Events/loadDatabase'); 
const config = require('../../config.json');

exports.help = {
    name: 'rolemembers',
    description: "Permet d'afficher un rôle avec ses membres",
    use: 'rolemembers <mention/id>',
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
        return message.reply({ content: "Le rôle n'existe pas ou n'est pas mentionné", allowedMentions: { repliedUser: false } });
    }


    if (role.members.size === 0) {
        return message.reply({ content: "Aucun membre n'a ce rôle", allowedMentions: { repliedUser: false } });
    }

    const membersArray = role.members.map(member => `<@${member.id}>`);
    const pageSize = 30; 
    const totalPages = Math.ceil(membersArray.length / pageSize);
    let currentPage = 0;

    const embed = (page) => {
        const start = page * pageSize;
        const end = start + pageSize;
        const membersToShow = membersArray.slice(start, end).join('\n') || 'Aucun membre à afficher';

        return new EmbedBuilder()
            .setTitle(`Membres ayant le rôle ${role.name}`)
            .setDescription(membersToShow)
            .setColor(role.color || config.color)
            .setFooter({ text: `Page ${page + 1} / ${totalPages}` });
    };

    const actionrow = () => {
        const row = new ActionRowBuilder();

        if (currentPage > 0) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('<')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (currentPage < totalPages - 1) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('>')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        return row.components.length > 0 ? row : null;
    };

    const actionRow = actionrow(); 
    const msg = await message.reply({ embeds: [embed(currentPage)], components: actionRow ? [actionRow] : [], allowedMentions: { repliedUser: false } });

    const filter = interaction => interaction.user.id === message.author.id && (interaction.customId === 'prev' || interaction.customId === 'next');
    const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'prev' && currentPage > 0) {
            currentPage--;
        } else if (interaction.customId === 'next' && currentPage < totalPages - 1) {
            currentPage++;
        }

        await interaction.update({ 
            embeds: [embed(currentPage)], 
            components: actionrow() ? [actionrow()] : [] 
        });
    });

    collector.on('end', () => {
        msg.edit({ components: [] }); 
    });
};
