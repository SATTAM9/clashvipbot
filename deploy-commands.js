require('dotenv').config()
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
const { clientID, ownerGuildID } = require('./config.json')
const fs = require('node:fs')

const commands = []
const commandFolders = fs.readdirSync('./service/commands', {withFileTypes: true})
	.filter(child => child.isDirectory())
	.map(child => child.name)

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./service/commands/${folder}`)
		.filter(file => file.endsWith('.js'))

    for (const file of commandFiles) {
      const command = require(`./service/commands/${folder}/${file}`)
      commands.push(command)
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.')

		const globalCommands = commands.filter(cmd => !cmd.mainServerOnly)
		const mainServerCommands = commands.filter(cmd => cmd.mainServerOnly)

		await rest.put(
			Routes.applicationCommands(clientID),
			{ body: globalCommands.map(cmd => cmd.data.toJSON()) },
		)

		await rest.put(
			Routes.applicationGuildCommands(clientID, ownerGuildID),
			{ body: mainServerCommands.map(cmd => cmd.data.toJSON()) },
		)

		console.log('Successfully reloaded application (/) commands.')
	} catch (error) {
		console.error(error)
	}
})()