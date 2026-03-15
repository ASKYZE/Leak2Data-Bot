const db = require('./loadDatabase');
const { ActivityType } = require('discord.js');

const inviteCache = new Map();

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      const invites = await member.guild.invites.fetch();
      const usedInvite = invites.find(i => i.uses > (inviteCache.get(i.code)?.uses || 0));
      
      if (usedInvite) {
        await db.run(`
          INSERT INTO invites (guild_id, user_id, count, regular, leaves) 
          VALUES (?, ?, 1, 1, 0)
          ON CONFLICT(guild_id, user_id) 
          DO UPDATE SET count = count + 1, regular = regular + 1
        `, [member.guild.id, usedInvite.inviter.id]);
      }
      invites.forEach(inv => inviteCache.set(inv.code, { uses: inv.uses }));

    } catch (error) {
      console.error('Erreur tracking invitations:', error);
    }

    db.get('SELECT channels FROM ghostping WHERE guild = ?', [member.guild.id], async (err, row) => {
      if (err || !row) return;
      const channelIds = row.channels.split(',').filter(Boolean);
      for (const id of channelIds) {
        const channel = member.guild.channels.cache.get(id);
        if (channel?.isTextBased()) {
          try {
            const msg = await channel.send(`<@${member.id}>`);
            setTimeout(() => msg.delete().catch(() => {}), 1500);
          } catch {}
        }
      }
    });

    db.get('SELECT antibot FROM antiraid WHERE guild = ?', [member.guild.id], async (err, row) => {
      if (row?.antibot === 1 && member.user.bot) {
        try {
          await member.kick('Antibot');
        } catch (error) {
          console.error(`Kick failed for ${member.user.tag}:`, error);
        }
      }
    });

    db.get('SELECT antitoken FROM antiraid WHERE guild = ?', [member.guild.id], async (err, row) => {
      if (!row?.antitoken) return;
      const accountAge = Date.now() - member.user.createdTimestamp;
      if (accountAge < 604800000) {
        try {
          await member.kick('Compte trop récent');
        } catch (error) {
          console.error(`Kick failed for ${member.user.tag}:`, error);
        }
      }
    });

    db.get('SELECT id, texte FROM soutien WHERE guild = ?', [member.guild.id], async (err, row) => {
      if (err || !row) return;
      const customStatus = member.presence?.activities?.find(a => a.type === ActivityType.Custom);
      if (customStatus?.state?.includes(row.texte)) {
        try {
          await member.roles.add(row.id, 'Soutien');
        } catch (e) {
          console.error('Erreur attribution rôle:', e);
        }
      }
    });

    db.get('SELECT channel, message FROM joinsettings WHERE guildId = ?', [member.guild.id], async (err, row) => {
      if (!row?.channel || row.channel === 'off') return;
      const channel = member.guild.channels.cache.get(row.channel);
      if (!channel) return;
      
      const msg = row.message
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{user\.name}/g, member.user.username)
        .replace(/{user\.tag}/g, member.user.tag)
        .replace(/{guild}/g, member.guild.name)
        .replace(/{guild\.memberCount}/g, member.guild.memberCount);
      
      channel.send(msg).catch(() => {});
    });
  }
};
