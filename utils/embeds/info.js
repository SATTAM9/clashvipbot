const { EmbedBuilder } = require('discord.js');
const client = require('../../client');
const { prettyNumbers } = require('../format');

const getInfo = (verificationCount) => new EmbedBuilder()
    .setTitle("Clashvip")
    .setColor('#34C6EB')
    .setDescription(
        `Clashvip enables more cohesion between between Clash of Clans and your Discord server. Track your stats with your community and show off your achievements!`)
    .setThumbnail(client.user.displayAvatarURL())
    .addFields(
    {
        name: 'Contributors',
        value: `• Clashvip - Development & Setup\n• Original Code - Azer & Hawk Eye\n• Clashvip - Customization & Deployment`,
        inline: true
    },
    {
        name: 'Source code',
        value: '[Contact Developer](https://github.com/SATTAM9/clashvipbot)',
        inline: true
    },
    {
        name: 'Verifications',
        value: `${prettyNumbers(verificationCount)}`,
        inline: true
    }
)
    .setFooter({text: 'Customized and deployed by Clashvip', iconURL: 'https://www.deckshop.pro/img/creatorcode/creator_code.png'})

module.exports = {
    getInfo
};
