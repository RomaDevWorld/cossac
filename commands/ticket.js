const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, Embed, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType } = require('discord.js')
const { QuickDB } = require('quick.db')
const db = new QuickDB().table('misc')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Майстер встановлення системи запитань')
        .addChannelOption(option => 
            option.setName('category')
            .setDescription('Категорія, в якій будуть створюватись канали для запитів.')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addRoleOption(option => option.setName('role').setDescription('Роль, власники якої зможуть бачити сворені канали'))
        .addStringOption(option => option.setName('text').setDescription('Користувацький опис для повідомлення'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {

        const embed = new EmbedBuilder()
        .setAuthor({ name: 'Створення тікетів!' })
        .setColor('Green')
        .setDescription(interaction.options.getString('text') || 'Натисніть на кнопку внизу щоб створити тікет')

        const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId(`ticket`)
            .setEmoji('🛎️')
            .setLabel('Створити новий')
            .setStyle(ButtonStyle.Primary)
        )

        const msg = await interaction.channel.send({ embeds: [embed], components: [row] })

        await db.set(`${interaction.guild.id}.ticket`, { category: interaction.options.getChannel('category').id, role: interaction.options.getRole('role')?.id || null })

        await interaction.reply({ content: 'Повідомленя створено!', ephemeral: true })
    }
}