const { EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// Fonction améliorée pour récupérer les données
const getInviteData = async (guildId, userId) => {
  const defaults = { invites: 0, regular: 0, leaves: 0 };
  
  const [inv, regular, leaves] = await Promise.all([
    db.get("SELECT value FROM JSON WHERE key = ?", [`invites_${guildId}_${userId}`]),
    db.get("SELECT value FROM JSON WHERE key = ?", [`Regular_${guildId}_${userId}`]),
    db.get("SELECT value FROM JSON WHERE key = ?", [`leaves_${guildId}_${userId}`])
  ]);

  return {
    invites: inv?.value ? parseInt(inv.value) : 0,
    regular: regular?.value ? parseInt(regular.value) : 0,
    leaves: leaves?.value ? parseInt(leaves.value) : 0
  };
};

module.exports = {
    help: {
        name: 'invites',
        aliases: ["invite"],
        description: 'Affiche vos statistiques d\'invitation',
        use: 'invites [@membre]'
    },
    run: async (client, message, args, prefix, color) => {
        try {
            const user = message.mentions.users.first() || message.author;
            const { invites, regular, leaves } = await getInviteData(message.guild.id, user.id);

            const embed = new EmbedBuilder()
                .setAuthor({ name: `Statistiques de ${user.username}` })
                .setColor(color || '#5865F2')
                .setDescription(
                    `**${invites}** invitations\n` +
                    `👥 ${regular} membres restés\n` +
                    `🚪 ${leaves} membres partis`
                )
                .setFooter({ text: 'Statistiques mises à jour' })
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur:', error);
            await message.channel.send('⚠️ Impossible d\'afficher les statistiques').catch(() => {});
        }
    }
};
