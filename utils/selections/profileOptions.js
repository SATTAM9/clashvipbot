const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js')
const { xp, versusbattles, star, clancastle, championking } = require('../../emojis.json')

const profileOptions = (selectedValue, disable = false) => {
    const [, xpname, xpid ] = xp.replace(/[<>]/g, '').split(':')
    const [, versusbattlesname, versusbattlesid ] = versusbattles.replace(/[<>]/g, '').split(':')
    const [, starName, starId ] = star.replace(/[<>]/g, '').split(':')
    const [, clanCastleName, clanCastleId ] = clancastle.replace(/[<>]/g, '').split(':')
    const [, heroName, heroId ] = championking.replace(/[<>]/g, '').split(':')

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`helpOption`)
            .setPlaceholder('What do you need help with?')
            .setDisabled(disable)
            .addOptions(
                new StringSelectMenuOptionBuilder()
					.setLabel(`Profile`)
					.setDescription(`General info for player.`)
                    .setValue('profile')
                    .setDefault(selectedValue === 'profile')
                    .setEmoji({name: xpname, id: xpid}),
                new StringSelectMenuOptionBuilder()
				.setLabel(`Army`)
				.setDescription(`Contains army levels.`)
				.setValue('army')
                    .setDefault(selectedValue === 'army')
                    .setEmoji({name: versusbattlesname, id: versusbattlesid}),
                new StringSelectMenuOptionBuilder()
				.setLabel(`Hero`)
				.setDescription(`Hero levels and equipment.`)
				.setValue('hero')
                    .setDefault(selectedValue === 'hero')
                    .setEmoji({name: heroName, id: heroId}),
                new StringSelectMenuOptionBuilder()
				.setLabel(`History`)
				.setDescription(`Player name history and clan log.`)
				.setValue('history')
                    .setDefault(selectedValue === 'history')
                    .setEmoji({name: starName, id: starId}),
                new StringSelectMenuOptionBuilder()
				.setLabel(`Clan Activity`)
				.setDescription(`Recent clan join/leave events.`)
				.setValue('clan-activity')
                    .setDefault(selectedValue === 'clan-activity')
                    .setEmoji({name: clanCastleName, id: clanCastleId})

            )
    )
}
    

module.exports = {
    profileOptions
};
  
