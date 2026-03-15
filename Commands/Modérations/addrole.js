const Discord = require('discord.js');
const db = require('../../Events/loadDatabase');
const config = require('../../config.json');
const sendLog = require('../../Events/sendlog');

exports.help = {
  name: 'addrole',
  sname: 'addrole <mention/id> <@role/id>',
  description: "Ajoute un rôle à un membre.",
  use: 'addrole <mention/id> <@role/id>',
};

exports.run = async (bot, message, args, config) => {
  // Vérification des permissions (votre système existant)
  const checkperm = async (message, commandName) => {
    if (config.owners.includes(message.author.id)) return true;

    const public = await db.get('SELECT statut FROM public WHERE guild = ? AND statut = ?', [message.guild.id, 'on'])
      .then(row => !!row)
      .catch(() => false);

    if (public) {
      const publiccheck = await db.get(
        'SELECT command FROM cmdperm WHERE perm = ? AND command = ? AND guild = ?',
        ['public', commandName, message.guild.id]
      ).then(row => !!row);
      if (publiccheck) return true;
    }

    try {
      const [userwl, userowner] = await Promise.all([
        db.get('SELECT id FROM whitelist WHERE id = ?', [message.author.id]),
        db.get('SELECT id FROM owner WHERE id = ?', [message.author.id])
      ]);

      if (userwl || userowner) return true;

      const userRoles = message.member.roles.cache.map(role => role.id);
      const permissions = await db.all(
        'SELECT perm FROM permissions WHERE id IN (?' + ',?'.repeat(userRoles.length - 1) + ') AND guild = ?',
        [...userRoles, message.guild.id]
      ).then(rows => rows.map(row => row.perm));

      const cmdwl = await db.all(
        'SELECT command FROM cmdperm WHERE perm IN (?' + ',?'.repeat(permissions.length - 1) + ') AND guild = ?',
        [...permissions, message.guild.id]
      ).then(rows => rows.map(row => row.command));

      return cmdwl.includes(commandName);
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      return false;
    }
  };

  if (!(await checkperm(message, exports.help.name))) {
    return message.reply({
      embeds: [new Discord.EmbedBuilder()
        .setDescription("Vous n'avez pas la permission d'utiliser cette commande.")
        .setColor(config.color)
      ],
      allowedMentions: { repliedUser: true }
    });
  }

  // Récupération du membre et du rôle
  const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

  if (!member || !role) {
    return message.reply("Usage: `addrole <@membre/id> <@role/id>`");
  }

  // Vérification hiérarchique améliorée
  const botMember = await message.guild.members.fetch(bot.user.id).catch(() => null);
  if (!botMember) {
    return message.reply("Impossible de vérifier mes permissions.");
  }

  if (role.position >= botMember.roles.highest.position) {
    return message.reply("Mon rôle est trop bas pour ajouter ce rôle.");
  }

  if (message.member.roles.highest.position <= role.position && !config.owners.includes(message.author.id)) {
    return message.reply("Vous ne pouvez pas ajouter un rôle supérieur au vôtre.");
  }

  // Ajout du rôle avec gestion d'erreur détaillée
  try {
    await member.roles.add(role);
    await message.reply(`Le rôle ${role.name} ajouté à ${member.user.tag}`);

    // Log
    const embed = new Discord.EmbedBuilder()
      .setColor(config.color)
      .setDescription(`${message.author} a ajouté le rôle ${role} à ${member}`)
      .setTimestamp();
    sendLog(message.guild, embed, 'rolelog');

  } catch (error) {
    console.error('Erreur ajout rôle:', {
      error: error.message,
      rolePos: role.position,
      botRolePos: botMember.roles.highest.position,
      target: member.user.tag
    });

    let errorMsg = "Erreur inconnue";
    if (error.code === 50013) errorMsg = "Permission manquante (Gérer les rôles)";
    if (error.code === 50035) errorMsg = "Hiérarchie des rôles bloquante";

    message.reply(`${errorMsg}\n\`${error.message}\``);
  }
};
