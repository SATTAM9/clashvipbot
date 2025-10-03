const { SlashCommandBuilder } = require('@discordjs/builders');
const { findTag, saveDefaultProfile, removeDefaultProfile } = require('../../../dao/mongo/profile/queries');
const { isOwnerOfAccount } = require('../../../dao/mongo/verification/queries');
const { parseTag, isTagValid } = require('../../../utils/arguments/tagHandling');
const { findProfile } = require('../../../dao/clash/verification');
const { getInvalidTagEmbed } = require('../../../utils/embeds/verify');
const { getProfileEmbed, getTroopShowcaseEmbed, getHistoryEmbed, getClanActivityEmbed, getHeroEmbed } = require('../../../utils/embeds/stats')
const { InteractionContextType, ApplicationIntegrationType, ComponentType, AttachmentBuilder, MessageFlags } = require('discord.js');
const { profileOptions } = require('../../../utils/selections/profileOptions');
const { expiredOptions } = require('../../../utils/selections/expiredOptions');
const { getLoadingEmbed } = require('../../../utils/embeds/loading');
const { getNotYourInteractionProfileEmbed } = require('../../../utils/embeds/safety/notYourInteractionProfile');
const renderManager = require('../../../utils/render/SafeRenderManager');
const { fetchPlayerHistory } = require('../../../utils/clashsiteApi')
const { createCanvas, loadImage } = require('canvas');

module.exports = {
  mainServerOnly: false,
  requiresConfigSetup: true,
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Get information about players in-game stats.')
    .setContexts(InteractionContextType.Guild, InteractionContextType.PrivateChannel, InteractionContextType.BotDM)
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
    .addSubcommand((subcommand) => 
        subcommand
          .setName('show')
          .setDescription('Gets the stats of an in-game account.')
          .addStringOption((option) =>
            option
            .setName('tag')
            .setDescription('The player tag to get the stats of.')
            .setRequired(false)
        ),
      )
      .addSubcommand((subcommand) =>
        subcommand
            .setName('save')
            .setDescription('Save an account as your default profile.')
            .addStringOption((option) =>
                option
                .setName('tag')
                .setDescription('The verified tag you want to save.')
                .setRequired(true)
            )
      
      )
      .addSubcommand((subcommand) =>
        subcommand
            .setName('remove')
            .setDescription('Remove your default profile.')
      ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'show'){
        console.log(`${new Date().toString()} ${interaction.user.id} used the command: /profile show`)

        const unsanitizedTag = interaction.options.getString('tag') ?? await findTag(interaction.user.id)
        
        if (!unsanitizedTag) {
            return await interaction.reply({
                content: `You have not set a default profile. To do so type \`/profile save <player tag>\``,
                flags: MessageFlags.Ephemeral
            })
        }
        
        const tag = parseTag(unsanitizedTag);
        if (!isTagValid(tag)) {
            return sendInvalidTagReply(interaction)
        }
        const playerResponse = await findProfile(tag)

        if (!playerResponse.response) {
            return await interaction.reply({
                content: `An error occured: ${playerResponse.error}`,
                flags: MessageFlags.Ephemeral
            })
        }

        if (!playerResponse.response.found) {
            return sendInvalidTagReply(interaction)
        }

        await interaction.deferReply();

        const verified = await isOwnerOfAccount(tag, interaction.user.id)
        const playerData = playerResponse.response.data

        const historyPromise = fetchPlayerHistory(playerData.tag).catch((error) => {
            console.error('player history fetch failed:', error);
            return { ok: false, error: 'History service unavailable.' };
        });

        const timeoutMs = 300_000
        const endTimestamp = Math.floor((Date.now() + timeoutMs) / 1000);

        const keyProfile = playerData.tag.replace(/[^a-zA-Z0-9-_]/g, '');
        const keyTroop = keyProfile + '_troop';
        const keyHero = keyProfile + '_hero';

        const profileImage = await renderManager.render('profile', playerData, keyProfile);
        const troopImage = await renderManager.render('troop', playerData, keyTroop);
        const heroImage = await renderManager.render('hero', playerData, keyHero);

        const playerLabels = await buildPlayerLabelsAssets(playerData.labels, keyProfile);

        const profileAttachment = new AttachmentBuilder(Buffer.from(profileImage.buffer), { name: profileImage.fileName });
        const labelAttachment = playerLabels?.buffer ? new AttachmentBuilder(Buffer.from(playerLabels.buffer), { name: playerLabels.fileName }) : null;
        const labelImageName = labelAttachment?.name;

        const profileEmbed = await getProfileEmbed(
            playerData,
            verified,
            null,
            profileImage.fileName,
            labelImageName
        );

        if (!labelAttachment && playerLabels?.fieldValue) {
            profileEmbed.addFields({
                name: 'Player labels',
                value: playerLabels.fieldValue,
                inline: false
            });
        }

        const files = labelAttachment ? [profileAttachment, labelAttachment] : [profileAttachment];
        const profileMenu = profileOptions('profile');

        const message = await interaction.editReply({
            embeds: [profileEmbed],
            files,
            components: [profileMenu]
        });

        const timestampedProfileEmbed = await getProfileEmbed(
            playerData,
            verified,
            endTimestamp,
            profileImage.fileName,
            labelImageName
        );

        if (!labelAttachment && playerLabels?.fieldValue) {
            timestampedProfileEmbed.addFields({
                name: 'Player labels',
                value: playerLabels.fieldValue,
                inline: false
            });
        }
        const timestampedTroopShowcaseEmbed = await getTroopShowcaseEmbed(playerData, verified, endTimestamp, troopImage.fileName)
        const heroEmbed = getHeroEmbed(playerData, verified, endTimestamp, heroImage?.fileName)

        const playerHistoryResult = await historyPromise
        if (!playerHistoryResult.ok) {
            console.warn(`History fetch issue for ${playerData.tag}:`, playerHistoryResult.error)
        }

        const historyEmbed = getHistoryEmbed(playerData, verified, endTimestamp, playerHistoryResult)
        const clanActivityEmbed = getClanActivityEmbed(playerData, verified, endTimestamp, playerHistoryResult)

        const dataOptions = {
            'profile': timestampedProfileEmbed,
            'army': timestampedTroopShowcaseEmbed,
            'hero': heroEmbed,
            'history': historyEmbed,
            'clan-activity': clanActivityEmbed
        }

        await interaction.editReply({
            embeds: [timestampedProfileEmbed],
            components: [profileMenu]
        });
        
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: timeoutMs
        });

        collector.on('collect', async (selectInteraction) => {
            if (selectInteraction.user.id !== interaction.user.id) {
                return await selectInteraction.reply({
                    embeds: [getNotYourInteractionProfileEmbed()],
                    flags: MessageFlags.Ephemeral
                });
            }
    
            const selected = selectInteraction.values[0];
            const selectedData = dataOptions[selected];

            if (!selectedData) {
                return await selectInteraction.reply({
                    content: 'Invalid selection.',
                    flags: MessageFlags.Ephemeral
                });
            }

            await selectInteraction.deferUpdate();

            await selectInteraction.editReply({
                embeds: [getLoadingEmbed()],
                files: [],
                components: [profileOptions(selected, true)]
            });
            
            let files = []
            if (selected === 'profile') {
                const profileFiles = [new AttachmentBuilder(Buffer.from(profileImage.buffer), { name: profileImage.fileName })];
                if (playerLabels?.buffer) {
                    profileFiles.push(new AttachmentBuilder(Buffer.from(playerLabels.buffer), { name: playerLabels.fileName }));
                }
                files = profileFiles;
            } else if (selected === 'army') {
                files = [new AttachmentBuilder(Buffer.from(troopImage.buffer), { name: troopImage.fileName })];
            } else if (selected === 'hero' && heroImage) {
                files = [new AttachmentBuilder(Buffer.from(heroImage.buffer), { name: heroImage.fileName })];
            }

            await selectInteraction.editReply({
                embeds: [selectedData],
                files,
                components: [profileOptions(selected)]
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [expiredOptions()] });
        });

    } else if (interaction.options.getSubcommand() === 'save') {
        console.log(`${new Date().toString()} ${interaction.user.id} used the command: /profile save`)
        const tag = parseTag(interaction.options.getString('tag'))
        if (!isTagValid(tag)) {
            sendInvalidTagReply(interaction)
            return
        }

        const playerResponse = await findProfile(tag)

        if (!playerResponse.response) {
            return await interaction.reply({
                content: `An error occured: ${playerResponse.error}`,
                flags: MessageFlags.Ephemeral
            })
        }

        if (!playerResponse.response.found) {
            sendInvalidTagReply(interaction)
            return
        }

        saveDefaultProfile(tag, interaction.user.id)
        return await interaction.reply({
            content: `I have successfully saved your profile #${tag} as the default one!`,
            flags: MessageFlags.Ephemeral
        })

    } else if ( interaction.options.getSubcommand() === 'remove') {
        console.log(`${new Date().toString()} ${interaction.user.id} used the command: /profile remove`)
        const foundDefaultProfile = await removeDefaultProfile(interaction.user.id)
        if (foundDefaultProfile) {
            return await interaction.reply({
                content: `I have removed your default profile.`,
                flags: MessageFlags.Ephemeral
            })
        }
        else {
            return await interaction.reply({
                content: `You don't have a default profile to remove!`,
                flags: MessageFlags.Ephemeral
            })
        }
    }
  }
};


const MAX_PLAYER_LABELS = 6;
const LABEL_ICON_SIZE = 96;
const LABEL_COLUMNS = 3;
const LABEL_HORIZONTAL_GAP = 28;
const LABEL_VERTICAL_GAP = 32;
const LABEL_PADDING_X = 36;
const LABEL_PADDING_Y = 40;
const LABEL_CANVAS_RADIUS = 28;
const LABEL_CANVAS_BORDER = 'rgba(148, 163, 184, 0.32)';
const LABEL_NAME_FONT = '600 26px "Segoe UI", "Noto Sans", sans-serif';
const LABEL_NAME_COLOR = 'rgba(248, 250, 252, 0.95)';
const LABEL_PLACEHOLDER_BG = 'rgba(55, 65, 81, 0.6)';
const LABEL_PLACEHOLDER_BORDER = 'rgba(148, 163, 184, 0.45)';
const LABEL_ICON_SHADOW_COLOR = 'rgba(15, 23, 42, 0.75)';
const LABEL_ICON_SHADOW_BLUR = 18;
const LABEL_ICON_CORNER_RADIUS = 18;
const LABEL_MARKER_DEFAULT = '\u2022';
const LABEL_COLUMN_SPACER = '   ';
const buildPlayerLabelsAssets = async (labels, keyPrefix) => {
  const list = Array.isArray(labels) ? labels.slice(0, MAX_PLAYER_LABELS) : [];
  if (!list.length) return null;

  const fieldValue = formatPlayerLabelsText(list);
  if (!fieldValue) return null;

  const labelEntries = await Promise.all(list.map(async (label) => {
    const name = label?.name ?? 'Unknown';
    const icon = label?.iconUrls?.small || label?.iconUrls?.medium || label?.iconUrls?.tiny;

    if (!icon) {
      return { name, image: null };
    }

    try {
      const image = await loadImage(icon);
      return { name, image };
    } catch (error) {
      console.warn(`Failed to load player label icon from ${icon}:`, error?.message || error);
      return { name, image: null };
    }
  }));

  const hasImages = labelEntries.some((entry) => entry.image);
  if (!hasImages) {
    return { fieldValue };
  }

  const buffer = renderPlayerLabels(labelEntries);
  return {
    fieldValue,
    buffer,
    fileName: `${keyPrefix}_labels.png`
  };
};

const formatPlayerLabelsText = (labels) => {
  if (!labels.length) {
    return null;
  }

  const rows = labels.map((label) => {
    const name = label?.name ?? 'Unknown';
    const icon = label?.iconUrls?.small || label?.iconUrls?.medium || label?.iconUrls?.tiny;
    const displayName = `**${name}**`;
    return icon ? `[${LABEL_MARKER_DEFAULT} ${displayName}](${icon})` : `${LABEL_MARKER_DEFAULT} ${displayName}`;
  });

  if (rows.length <= 3) {
    return rows.join('\n');
  }

  const midpoint = Math.ceil(rows.length / 2);
  const firstColumn = rows.slice(0, midpoint);
  const secondColumn = rows.slice(midpoint);

  return firstColumn.map((value, index) => {
    const right = secondColumn[index];
    return right ? `${value}${LABEL_COLUMN_SPACER}${right}` : value;
  }).join('\n');
};

const renderPlayerLabels = (entries) => {
  const columns = Math.min(LABEL_COLUMNS, entries.length);
  const rows = Math.ceil(entries.length / columns);
  const textHeight = 34;

  const width = LABEL_PADDING_X * 2 + columns * LABEL_ICON_SIZE + (columns - 1) * LABEL_HORIZONTAL_GAP;
  const height = LABEL_PADDING_Y * 2 + rows * (LABEL_ICON_SIZE + textHeight) + (rows - 1) * LABEL_VERTICAL_GAP;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(17, 24, 39, 0.96)');
  gradient.addColorStop(1, 'rgba(15, 23, 42, 0.92)');

  drawRoundedRect(ctx, 0, 0, width, height, LABEL_CANVAS_RADIUS);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = LABEL_CANVAS_BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();

  entries.forEach((entry, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = LABEL_PADDING_X + column * (LABEL_ICON_SIZE + LABEL_HORIZONTAL_GAP);
    const y = LABEL_PADDING_Y + row * (LABEL_ICON_SIZE + textHeight + LABEL_VERTICAL_GAP);

    ctx.save();
    ctx.shadowColor = LABEL_ICON_SHADOW_COLOR;
    ctx.shadowBlur = LABEL_ICON_SHADOW_BLUR;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, x + 2, y + 4, LABEL_ICON_SIZE, LABEL_ICON_SIZE, LABEL_ICON_CORNER_RADIUS);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fill();
    ctx.restore();

    if (entry.image) {
      ctx.save();
      drawRoundedRect(ctx, x, y, LABEL_ICON_SIZE, LABEL_ICON_SIZE, LABEL_ICON_CORNER_RADIUS);
      ctx.clip();
      ctx.drawImage(entry.image, x, y, LABEL_ICON_SIZE, LABEL_ICON_SIZE);
      ctx.restore();

      ctx.save();
      drawRoundedRect(ctx, x, y, LABEL_ICON_SIZE, LABEL_ICON_SIZE, LABEL_ICON_CORNER_RADIUS);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      drawRoundedRect(ctx, x, y, LABEL_ICON_SIZE, LABEL_ICON_SIZE, LABEL_ICON_CORNER_RADIUS);
      ctx.fillStyle = LABEL_PLACEHOLDER_BG;
      ctx.fill();
      ctx.strokeStyle = LABEL_PLACEHOLDER_BORDER;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = LABEL_NAME_COLOR;
      ctx.font = '700 34px "Segoe UI", "Noto Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((entry.name || '?').charAt(0).toUpperCase(), x + LABEL_ICON_SIZE / 2, y + LABEL_ICON_SIZE / 2);
      ctx.restore();
    }

    ctx.save();
    ctx.font = LABEL_NAME_FONT;
    ctx.fillStyle = LABEL_NAME_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const text = fitText(ctx, entry.name, LABEL_ICON_SIZE);
    ctx.fillText(text, x + LABEL_ICON_SIZE / 2, y + LABEL_ICON_SIZE + 8);
    ctx.restore();
  });

  return canvas.toBuffer('image/png');
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const fitText = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return truncated.length ? truncated + '...' : text;
};

const sendInvalidTagReply = async(interaction) => await interaction.reply({
    embeds: [getInvalidTagEmbed()],
    flags: MessageFlags.Ephemeral
});
