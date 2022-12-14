const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { QuickDB } = require('quick.db')
const db = new QuickDB().table('logs')
const moment = require('moment')
moment.locale('uk')

module.exports = async function (type, client, options) {
    var channel
    //messageDelete
    if(type === 'msgDelete'){
        channel = await getlog(options.message.guild, true) //Finds a log channel from db
        if(!channel || await isOn(channel.guild, 'msgDelete') === false || options.message.author.bot) return; //If channel wasn't found or switcher is off, or user is bot - return
        let embed = new EmbedBuilder()
        .setAuthor({ name: `Повідомлення видалено | ${options.message.member.nickname}`, iconURL: options.message.member.displayAvatarURL({ dynamic: true }) })
        .setDescription(`[Перейти до повідомлення](${options.message.url})\n**Контент повідомлення:**\n` + options.message.content || `?` + `\n${options.message.attachments.map(i => i.url).join(`\n`)}`)
        .addFields(
            { name: 'Автор', value: `${options.message.author} (${options.message.author.tag})`, inline: true },
            { name: 'Канал', value: `${options.message.channel} (#${options.message.channel.name})`, inline: true }
        )
        .setFooter({ text: `USID: ${options.message.author.id}` })
        .setColor('Red')
        .setTimestamp()
        await channel.send({ embeds: [embed] }) //Creates an embed and send's it to the log channel
    }
    //messageUpdate
    else if(type === 'msgUpdate'){
        channel = await getlog(options.newMessage.guild, true)
        if(!channel || await isOn(channel.guild, 'msgUpdate') === false || options.newMessage.author.bot) return; //Does the same thing every time

        let embed = new EmbedBuilder()
        .setAuthor({ name: `Повідомлення відредаговано | ${options.newMessage.member.nickname}`, iconURL: options.newMessage.member.displayAvatarURL({ dynamic: true }) })
        .setDescription(`[Перейти до повідомлення](${options.newMessage.url})`)
        .addFields(
            { name: 'Автор', value: `${options.newMessage.author} (${options.newMessage.author.tag})`, inline: true },
            { name: 'Канал', value: `${options.newMessage.channel} (#${options.newMessage.channel.name})`, inline: true },
            { name: 'Раніше:', value: `${options.oldMessage.content || `?`}\n${`${options.oldMessage.attachments.map(i => i.url).join(`\n`)}` || ``}` },
            { name: 'Зараз:', value: `${options.newMessage.content || `?`}\n${`${options.newMessage.attachments.map(i => i.url).join(`\n`)}` || ``}` }
        )
        .setFooter({ text: `USID: ${options.newMessage.author.id}` })
        .setColor('Blue')
        .setTimestamp()
        
        await channel.send({ embeds: [embed] })
    }
    //guildMemberUpdate
    else if(type === 'memUpdate'){
        channel = await getlog(options.newMember.guild, true)
        if(!channel || await isOn(channel.guild, 'memUpdate') === false) return;

        if(options.oldMember.nickname !== options.newMember.nickname){ //If old nickname and new nickname's are not the same
            let embed = new EmbedBuilder()
            .setAuthor({ name: `Нікнейм змінено | ${options.newMember.user.tag}`, iconURL: options.newMember.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${options.newMember} змінив нікнейм!`)
            .addFields(
                { name: 'Раніше', value: `${options.oldMember.nickname}`, inline: true },
                { name: 'Зараз', value: `${options.newMember.nickname}`, inline: true },
            )
            .setFooter({ text: `USID: ${options.newMember.id}` })
            .setColor('Blue')
            .setTimestamp()
            let log = await channel.send({ embeds: [embed] }) //Creare an embed then send it to the log

            const audit = await fetchLog(channel.guild, AuditLogEvent.MemberUpdate)
            if(!audit || audit.target.id !== options.newMember.id) return;

            embed.addFields({ name: 'Модератор', value: `${audit.executor}` })
            log.edit({ embeds: [embed] })

        }

        let embed = new EmbedBuilder()
        .setAuthor({ name: `Ролі змінено! | ${options.newMember.nickname || options.newMember.user.username}`, iconURL: options.newMember.displayAvatarURL({ dynamic: true }) })
        .setColor('Yellow')
        .setTimestamp()
        .setFooter({ text: `USID: ${options.newMember.id}` })
        if (options.oldMember.roles.cache.size > options.newMember.roles.cache.size) { //Role was removed
            let reRole = []
            options.oldMember.roles.cache.forEach(role => { //Loop throught every old role
                if (!options.newMember.roles.cache.has(role.id)) reRole.push(role) //If new role doesn't have old one - push it to the array
            });
            embed.addFields({ name: `Вилучені ролі:`, value: reRole.join(`\n`) }) //Add a field with the removed roles
        } else if (options.oldMember.roles.cache.size < options.newMember.roles.cache.size) { //Role was added
            let adRole = []
            options.newMember.roles.cache.forEach(role => { //Loop throught every new role
                if (!options.oldMember.roles.cache.has(role.id)) adRole.push(role) //If old role doesn't have new one - push it to the array
            });
            embed.addFields({ name: `Додані ролі:`, value: adRole.join(`\n`) }) //Add a field with the new roles
        }
        if(embed.data.fields){
            let log = await channel.send({ embeds: [embed] }) //If at least one of the fields was added - send embed to the log
            const audit = await fetchLog(channel.guild, AuditLogEvent.MemberUpdate)
            if(!audit || audit.target.id !== options.newMember.id) return;

            embed.addFields({ name: 'Модератор', value: `${audit.executor}` })
            log.edit({ embeds: [embed] })
        } 

        if(options.oldMember.communicationDisabledUntil && !options.newMember.communicationDisabledUntil){
            const embed = new EmbedBuilder()
            .setAuthor({ name: `Участник розм'ючений | ${options.newMember.nickname || options.newMember.user.username}`, iconURL: options.newMember.displayAvatarURL({ dynamic: true }) })
            .setColor('Green')
            .setTimestamp()
            .setFooter({ text: `USID: ${options.newMember.id}` })
            .addFields({
                name: 'Участник', value: `${options.newMember}`
            })
            let log = await channel.send({ embeds: [embed] }) //Creare an embed then send it to the log

            const audit = await fetchLog(channel.guild, AuditLogEvent.MemberUpdate)
            if(!audit || audit.target.id !== options.newMember.id) return;

            embed.addFields({ name: 'Модератор', value: `${audit.executor}` })
            log.edit({ embeds: [embed] })

        }else if(options.newMember.communicationDisabledUntil && !options.oldMember.communicationDisabledUntil){
            let time = options.newMember.communicationDisabledUntil
            const embed = new EmbedBuilder()
            .setAuthor({ name: `Участник зам'ючений | ${options.newMember.nickname || options.newMember.user.username}`, iconURL: options.newMember.displayAvatarURL({ dynamic: true }) })
            .setColor('Red')
            .setTimestamp()
            .setFooter({ text: `USID: ${options.newMember.id}` })
            .addFields({
                name: 'Участник', value: `${options.newMember}`,
                name: "Час блокування", value: `${moment(time).fromNow()} (${moment(time).format('L')})`
            })
            let log = await channel.send({ embeds: [embed] }) //Creare an embed then send it to the log

            const audit = await fetchLog(channel.guild, AuditLogEvent.MemberUpdate)
            if(!audit || audit.target.id !== options.newMember.id) return;

            embed.addFields({ name: 'Модератор', value: `${audit.executor}` })
            log.edit({ embeds: [embed] })
        }
    }
    else if(type === 'memRemove'){
        channel = await getlog(options.member.guild, true)
        if(!channel || await isOn(channel.guild, 'memRemove') === false) return; //Does the same

        let embed = new EmbedBuilder()
        .setAuthor({ name: `Участник вийшов | ${options.member.nickname}`, iconURL: options.member.displayAvatarURL({ dynamic: true }) })
        .setDescription(`${options.member} (${options.member.user.tag})`)
        .setFooter({ text: `ID: ${options.member.id}` })
        .setColor('Orange')
        .setTimestamp()
        let log = await channel.send({ embeds: [embed] })

        const audit = await fetchLog(channel.guild, AuditLogEvent.MemberKick)
        if(!audit || audit.target.id !== options.member.id) return;

        let kickEmbed = new EmbedBuilder()
        .setAuthor({ name: `Участник вигнаний | ${options.member.user.username}`, iconURL: options.member.displayAvatarURL({ dynamic: true }) })
        .setDescription(`${options.member} (${options.member.user.tag})`)
        .addFields({ name: 'Модератор', value: `${audit.executor}` })
        .setFooter({ text: `ID: ${options.member.id}` })
        .setColor('Red')
        .setTimestamp()
        log.edit({ embeds: [kickEmbed] })
    }
    //guildMemberAdd
    else if(type === 'memAdd'){
        channel = await getlog(options.member.guild, true)
        if(!channel || await isOn(channel.guild, 'memAdd') === false) return; //Does the same

        let embed = new EmbedBuilder()
        .setAuthor({ name: `Участник приєднався`, iconURL: options.member.displayAvatarURL({ dynamic: true }) })
        .setDescription(`${options.member} (${options.member.user.tag})\nАккаунт створений: ${moment(options.member.user.createdAt).format('YYYY.DD.MM HH:mm')}`)
        .setFooter({ text: `ID: ${options.member.id}` })
        .setColor('Green')
        .setTimestamp()
        await channel.send({ embeds: [embed] })
    }
    //guildBanAdd
    else if(type === 'banAdd'){
        //Doesn't actyally work :(

        channel = await getlog(options.guild, true)
        if(!channel || await isOn(channel.guild.guild, 'banAdd') === false) return;

        let embed = new EmbedBuilder()
        .setAuthor({ name: `Участник заблокований | ${options.user.username}`, iconURL: options.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`${options.user} (${options.member.user.tag})`)
        .setFooter({ text: `ID: ${options.user.id}` })
        .setColor('Red')
        .setTimestamp()
        await channel.send({ embeds: [embed] })
    }
    //guildBanRemove
    else if(type === 'banRemove'){
        //Doesn't actyally work :(

        channel = await getlog(options.guild, true)
        if(!channel || await isOn(channel.guild, 'banRemove') === false) return;

        let embed = new EmbedBuilder()
        .setAuthor({ name: `Участник розблокований | ${options.user.username}`, iconURL: options.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`${options.user} (${options.member.user.tag})`)
        .setFooter({ text: `ID: ${options.user.id}` })
        .setColor('Yellow')
        .setTimestamp()
        await channel.send({ embeds: [embed] })
    }
    else if(type === 'voiceJ'){
        channel = await getlog(options.newVoiceState.guild, true)
        if(!channel || await isOn(channel.guild, 'voiceJ') === false) return;

        let embed = new EmbedBuilder()
        .setAuthor({ name: `${options.newVoiceState.member.user.tag}`, iconURL: options.newVoiceState.member.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`**Приєднався до ${options.newVoiceState.channel}**`)
        .setFooter({ text: `USID: ${options.newVoiceState.id}` })
        let msg = await channel.send({ embeds: [embed] })
        require(`./voiceSession.js`)(options.newVoiceState.id, channel, 0, msg)
    }
    else if(type === 'voiceL'){
        channel = await getlog(options.newVoiceState.guild, true)
        if(!channel || await isOn(channel.guild, 'voiceL') === false) return;

        let msg = await require(`./voiceSession.js`)(options.newVoiceState.id, channel, 2)
        if(!msg) return;
        msg.message.embeds[0].data.description = (msg.message.embeds[0].data.description + `\n**Від'єднався, сессія тривала ${new Date(Date.now() - msg.time).toISOString().slice(11, 19)}**`).slice(0, 4000)
        msg.message.edit({ embeds: [msg.message.embeds[0]] })
    }
    else if(type === 'voiceM'){
        channel = await getlog(options.newVoiceState.guild, true)
        if(!channel || await isOn(channel.guild, 'voiceM') === false) return;

        let msg = await require(`./voiceSession.js`)(options.newVoiceState.id, channel, 1)
        if(!msg) return;
        msg.embeds[0].data.description = (msg.embeds[0].data.description + `\n=> ${options.newVoiceState.channel}`).slice(0, 4000)
        msg.edit({ embeds: [msg.embeds[0]] })
    }
};

async function getlog(guild, bool) {
    if(bool === true){ //For some reason i've added a boolean?
        return guild.channels.cache.get(await db.get(`${guild.id}.channel`)) //Returns a channel, that have been found from db(or not)
    } 
    return await db.get(guild.id)
}

async function isOn(guild, type){
    if((await db.get(`${guild.id}.types`)).includes(type)){ //If db array has that type
        return true
    }else{ //Nah
        return false
    }
}

async function fetchLog(guild, type){
    const fetchedLogs = await guild.fetchAuditLogs({
		limit: 1,
		type: type,
	});
    return fetchedLogs.entries.first();
}