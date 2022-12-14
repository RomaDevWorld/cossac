const { PermissionsBitField, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { QuickDB } = require('quick.db')
const db = new QuickDB().table('misc')
const moment = require('moment')
const { createWriteStream, unlink } = require('fs')

module.exports = { //BUTTON'S INFORMATION
    id: "tick_",
    async execute(interaction){
        try{
            let channel = interaction.channel

            if(interaction.customId.endsWith('0')){

                let permissionArray = []
                channel.permissionOverwrites.cache.forEach(i => {
                    if(i.id === interaction.guild.id) permissionArray.push({ id: i.id, deny: [PermissionsBitField.Flags.ViewChannel] })
                    else permissionArray.push(
                        { 
                            id: i.id, 
                            allow: [PermissionsBitField.Flags.ViewChannel], 
                            deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions, PermissionsBitField.Flags.UseApplicationCommands] 
                        })
                })

                if(await db.get(`${interaction.guild.id}.ticket`)){
                    channel.permissionOverwrites.set(permissionArray);
                }else{
                    channel.permissionOverwrites.set([{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]);
                }

                interaction.message.edit({ components: [] })

                const messages = await channel.messages.fetch()
                const createdAt = messages.last().createdTimestamp
                const script = messages.reverse().filter(m => !m.author.bot).map(m => `${m.author.tag}: ${m.content || `Системне повідомлення`}`).join('\n')

                const stream = await createWriteStream(`./cache/${channel.name}.log`);
                if(script.length > 0){
                    stream.write(`[Обговорення розпочато ${moment(createdAt).format(`DD.MM.YYYY HH:mm`)}]\n`)
                    stream.write(script)
                    stream.write(`\n[Обговорення закрито ${moment(Date.now()).format(`DD.MM.YYYY HH:mm`)} користувачем ${interaction.user.tag}]`)
                    stream.end()
                }else{
                    stream.end()
                }

                const attachment = new AttachmentBuilder(stream.path, { name: 'Ticket-Transcription.log' })

                const embed = new EmbedBuilder()
                .setColor('Red')
                .addFields(
                    { name: 'Обговорення закрито', value: `**${interaction.member.nickname || interaction.user.username}** закрив обговорення` }
                )
                .setFooter({ text: 'Цей канал буде видалено через 5 хвилин' })

                const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                    .setLabel('Видалити зараз')
                    .setCustomId('delete')
                    .setStyle(ButtonStyle.Danger)
                )

                await interaction.reply({ embeds: [embed], components: [row] }).then(async() => {
                    if(script.length > 0) await interaction.followUp({ content: 'Не забудьте зберегти транскрипцію!', files: [attachment] })
                })
                
                unlink(`${stream.path}`, (err) => {
                    if(err) console.error(err)
                })

                setTimeout(() => {
                    channel.delete().catch(err => console.error(err))
                }, 5 * 60000)

            }
        }catch(err){
            console.error(err)
            await interaction.reply({ content: 'Щось пішло не так!', ephemeral: true })
        }
}}