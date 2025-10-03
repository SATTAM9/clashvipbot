const { createCanvas, registerFont } = require('canvas');
const { getImagePath, getFontPath, clashFont, tagFont, mapClanRoles, getTrophyLeagueImagePath, getLeagueName, drawRoundedRectPath, drawRightRoundedRectPath, getTownhallPath, clashFontScaled, formatDateYearMonth, signature, getAchievementStarsImagePath, formatNumberWithSpaces, getLastYearMonth, getCachedImage, createOptimizedGradient, preloadImages, setupCanvasContext, autoThrottleCacheClear } = require('./shared');

registerFont(getFontPath('Clash_Regular'), { family: 'ClashFont' });



const defaultCardShadow = {
    color: 'rgba(34, 25, 58, 0.35)',
    blur: 65,
    offsetX: 0,
    offsetY: 32
};

const withCardShadow = (ctx, drawCallback, customShadow = {}) => {
    const shadow = { ...defaultCardShadow, ...customShadow };
    ctx.save();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
    ctx.shadowOffsetX = shadow.offsetX;
    ctx.shadowOffsetY = shadow.offsetY;
    drawCallback();
    ctx.restore();
};

const drawCardOutline = (ctx, x, y, width, height, radius, strokeStyle = 'rgba(255, 255, 255, 0.4)', lineWidth = 8) => {
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.stroke();
    ctx.restore();
};

const addCardHighlight = (ctx, x, y, width, height, radius, opacity = 0.35) => {
    ctx.save();
    const highlightHeight = Math.max(height * 0.45, 160);
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    const gradient = ctx.createLinearGradient(x, y, x, y + highlightHeight);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, highlightHeight);
    ctx.restore();
};

const getProfileImage = async (profile, key) => {
    const hasLegendStats = !!(profile?.legendStatistics?.bestSeason)
    
    const width = 3500;
    const height = hasLegendStats ? 2650 : 2250;
    const canvas = createCanvas(width, height);
    const ctx = setupCanvasContext(canvas.getContext('2d'))

    const backgroundGradient = createOptimizedGradient(ctx, 'profile-background', 0, 0, width, height, [
        { offset: 0, color: '#f3f5ff' },
        { offset: 0.5, color: '#e4e7fb' },
        { offset: 1, color: '#d9deee' }
    ]);
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.65;
    const backdropAccent = createOptimizedGradient(ctx, 'profile-background-accent', 0, 0, width, height, [
        { offset: 0, color: 'rgba(236, 229, 255, 0.85)' },
        { offset: 1, color: 'rgba(236, 229, 255, 0)' }
    ]);
    ctx.fillStyle = backdropAccent;
    ctx.fillRect(0, 0, width, height * 0.45);
    ctx.restore();

    const requiredImages = [
        getTownhallPath(profile.townHallLevel),
        getImagePath('xp'),
        getImagePath('shine')
    ];

    if (profile.clan) {
        requiredImages.push(profile.clan.badgeUrls.medium);
    }
    
    // Achievement images
    if (profile.achievements) {
        profile.achievements.forEach(achievement => {
            if (achievement.stars > 0) {
                requiredImages.push(getAchievementStarsImagePath(achievement.stars));
            }
        });
    }

    await nameCardSection(profile, ctx, 25, 25);

    if (hasLegendStats) {
        await legendLeagueSection(profile.legendStatistics, ctx, 25, 1000);
    }

    const achievementsY = hasLegendStats ? 1425 : 1000;
    await achievementsSection(profile.achievements, ctx, 75, achievementsY);

    autoThrottleCacheClear();

    const buffer = canvas.toBuffer('image/png');
    const fileName = `player-profile-${key}.png`
    return { buffer, fileName };
};

const nameCardSection = async (profile, ctx, x, y) => {
    const width = 3450
    const height = 950
    const radius = 10
    
    const paddingTop = 75
    const paddingLeft = 75

    const gradient = createOptimizedGradient(ctx, 'namecard', x, y, width, height, [
        { offset: 0, color: '#8896c2' },
        { offset: 0.65, color: '#7483ad' },
        { offset: 1, color: '#5f6f93' }
    ]);

withCardShadow(ctx, () => {
    ctx.fillStyle = gradient;
    drawRoundedRectPath(ctx, x, y, width, height, radius); 
ctx.fill();
    });

    addCardHighlight(ctx, x, y, width, height, radius, 0.45);
    drawCardOutline(ctx, x, y, width, height, radius, 'rgba(106, 119, 152, 0.85)', 8);

    dividerLine(ctx, x + paddingLeft + 1400, x + paddingLeft + 1400, y + paddingTop, y + paddingTop + 700, '#454f6e', '#c5cbe4')
    dividerLine(ctx, x + paddingLeft + 2300, x + paddingLeft + 2300, y + paddingTop, y + paddingTop + 700, '#454f6e', '#c5cbe4')

    await nameSection(profile, ctx, x + paddingLeft, y + paddingTop + 50),
    await clanSection(profile, ctx, x + paddingLeft + 1600, y + paddingTop + 100),
    await townhallSection(profile, ctx, x + paddingLeft + 2200, y + paddingTop, width, height)

    addSeasonalSection(profile, ctx, x, y, width, height, radius)
}

const addSeasonalSection = (profile, ctx, x, y, width, height, radius) => {
    const purpleHeight = 125;
    const purpleY = y + height - purpleHeight;

    ctx.beginPath();
    ctx.moveTo(x, purpleY);
    ctx.lineTo(x + width, purpleY);
    ctx.lineTo(x + width, purpleY + purpleHeight - radius);
    ctx.quadraticCurveTo(x + width, purpleY + purpleHeight, x + width - radius, purpleY + purpleHeight);
    ctx.lineTo(x + radius, purpleY + purpleHeight);
    ctx.quadraticCurveTo(x, purpleY + purpleHeight, x, purpleY + purpleHeight - radius);
    ctx.lineTo(x, purpleY);
    ctx.closePath();

    ctx.fillStyle = '#4e4d79';
    ctx.fill();

    ctx.fillStyle = '#7964a5';
    ctx.fillRect(x, purpleY + 3, width, 5);

    const troopsDonated = profile.donations
    const troopsReceived = profile.donationsReceived
    const attacksWon = profile.attackWins
    const defensesWon = profile.defenseWins
    
    drawPixelLine(ctx, 100, purpleY + 100, 500)
    clashFont(ctx, 'Troops donated:', 100, purpleY + 50, '50')
    seasonalStatBox(ctx, 625, purpleY + 20, troopsDonated)

    drawPixelLine(ctx, 900, purpleY + 100, 505)
    clashFont(ctx, 'Troops received:', 900, purpleY + 50, '50')
    seasonalStatBox(ctx, 1425, purpleY + 20, troopsReceived)

    drawPixelLine(ctx, 1815, purpleY + 100, 390)
    clashFont(ctx, 'Attacks won:', 1815, purpleY + 50, '50')
    seasonalStatBox(ctx, 2215, purpleY + 20, attacksWon)

    drawPixelLine(ctx, 2615, purpleY + 100, 440)
    clashFont(ctx, 'Defenses won:', 2615, purpleY + 50, '50')
    seasonalStatBox(ctx, 3065, purpleY + 20, defensesWon)
}

const seasonalStatBox = (ctx, x, y, message) => {
    const width = 250;
    const height = 90;
    const radius = 30;

    const gradient = createOptimizedGradient(ctx, 'seasonal-stat-box', x, y, width, height, [
        { offset: 0, color: '#5b5aa4' },
        { offset: 1, color: '#403f73' }
    ]);

    ctx.save();
    ctx.fillStyle = gradient;
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    const overlay = createOptimizedGradient(ctx, 'seasonal-stat-box-highlight', x, y, width, height, [
        { offset: 0, color: 'rgba(255, 255, 255, 0.35)' },
        { offset: 1, color: 'rgba(255, 255, 255, 0)' }
    ]);
    ctx.fillStyle = overlay;
    ctx.fillRect(x + 4, y + 4, width - 8, height / 2);
    ctx.restore();

    clashFont(ctx, message, x + (width / 2), y + (height / 2), '48', true, '#fff5d6');
}

const drawPixelLine = (ctx, x, y, width) => {
    ctx.fillStyle = '#3a3766';
    ctx.fillRect(x, y, width, 4);
    
    ctx.fillStyle = '#9a82d0';
    ctx.fillRect(x, y + 4, width, 4);
}

const legendLeagueSection = async (legendStats, ctx, x, y) => {
    const bestSeason = legendStats.bestSeason
    const previousSeason = legendStats.previousSeason
    const legendTrophies = legendStats.legendTrophies

    const width = 3450
    const height = 400
    const radius = 10
    
    const paddingTop = 50
    const paddingLeft = 200

    const gradient = createOptimizedGradient(ctx, 'legendleaguesection', x, y, width, height, [
        { offset: 0, color: '#4c3f86' },
        { offset: 1, color: '#6d64ac' }
    ]);

withCardShadow(ctx, () => {
    ctx.fillStyle = gradient;
    drawRoundedRectPath(ctx, x, y, width, height, radius); 
    ctx.fill();
    });

    addCardHighlight(ctx, x, y, width, height, radius, 0.4);
    drawCardOutline(ctx, x, y, width, height, radius, 'rgba(53, 43, 99, 0.85)', 8);

    ctx.save();
    ctx.globalAlpha = 0.9;
    const ribbon = createOptimizedGradient(ctx, 'legendleaguesection-ribbon', x, y, width, height, [
        { offset: 0, color: 'rgba(168, 130, 236, 0)' },
        { offset: 0.5, color: 'rgba(168, 130, 236, 0.85)' },
        { offset: 1, color: 'rgba(168, 130, 236, 0)' }
    ]);
ctx.strokeStyle = ribbon;
    ctx.lineWidth = 85;
    ctx.lineCap = 'round';
    ctx.beginPath();
        ctx.moveTo(x + 140, y + 70);
    ctx.lineTo(x + width - 140, y + 70);
    ctx.stroke();
    ctx.restore();

    clashFont(ctx, 'Legend League Tournament', x + (width / 2), y + 55, '70', true, '#f6f2ff')

    dividerLine(ctx, x + paddingLeft + 1000, x + paddingLeft + 1000, y + paddingTop + 75, y + paddingTop + 325, '#342d5b', '#a79cdc')
    dividerLine(ctx, x + paddingLeft + 2175, x + paddingLeft + 2175, y + paddingTop + 75, y + paddingTop + 325, '#342d5b', '#a79cdc')

    await trophyLegendarySection(bestSeason, ctx, x + paddingLeft, y + (paddingTop/2), 'Best'),
    await trophyLegendarySection(previousSeason, ctx, x + paddingLeft + 1100, y + (paddingTop/2), 'Previous'),
    await legendTrophySection(legendTrophies, ctx, x + paddingLeft + 2400, y + (paddingTop/2))
}

const trophyLegendarySection = async (season, ctx, x, y, type) => {
    const rank = season?.rank
    const trophies = season?.trophies
    const date = season?.id

    if (season) {
        const legendImagePath = getImagePath("Icon_HV_League_Legend");
        const legendImage = await getCachedImage(legendImagePath);

        ctx.drawImage(legendImage, x, y + 100, 250, 250);
        clashFontScaled(ctx, rank, x + 125, y + 220, 200, 160, true)
        clashFont(ctx, `${type}: ${formatDateYearMonth(date)}`, x + 275, y + 125, '50', false)
        statBanner(ctx, x + 275, y + 200, 150, 150, 'trophy', trophies, '#242135')
    }
    if (!season) {
        const unrankedImagePath = getImagePath("Icon_HV_League_None");
        const unrankedImage = await getCachedImage(unrankedImagePath);

        ctx.drawImage(unrankedImage, x, y + 100, 250, 250);

        clashFont(ctx, `Did not place`, x + 300, y + 250, '50', false, '#dde2ff')
        clashFont(ctx, `${type}: ${formatDateYearMonth(getLastYearMonth())}`, x + 275, y + 125, '50', false)
    }
    
}

const legendTrophySection = async (legendTrophies, ctx, x, y) => {
    clashFont(ctx, `Legend trophies:`, x, y + 125, '50', false)
    statBanner(ctx, x, y + 200, 150, 150, 'legendtrophy', legendTrophies, '#242135')
}

const achievementBanner = async (ctx, x, y, cellHeight, cellWidth, achievementTitle, achievementIcon, achievement) => {
    const achievementStars = achievement.stars
    const achievementValue = achievement.value
    
    const achievementIconWidth = 150
    const achievementIconHeight = 150
    
    const barHeight = 80;
    const barRadius = barHeight / 5;
    const barPadding = (achievementIconWidth / 2) + 20;
    const spacingBetween = 20;

    const starsWidth = 288;
    const starsHeight = 115;
    const starsX = x + 30;
    const starsY = y + (cellHeight / 2) - (starsHeight / 2);

    const xFromStatIcon = x + starsWidth + 70;

    const achievementIconPath = getImagePath(achievementIcon);
    const achievementIconImage = await getCachedImage(achievementIconPath);
    const starsImagePath = getAchievementStarsImagePath(achievementStars);
    const starsImage = await getCachedImage(starsImagePath);

    const iconY = y + (cellHeight / 2) - (achievementIconHeight / 2) + 10;
    const iconCenterY = iconY + (achievementIconHeight / 2) + 10

    const barX = xFromStatIcon + (achievementIconWidth / 2);
    const barY = iconCenterY - (barHeight / 2);


    ctx.font = 'bold 60px Clash';
    const text = formatNumberWithSpaces(achievementValue.toString())
    const textWidth = ctx.measureText(text).width;

    const barWidth = Math.max(
        barPadding + spacingBetween + textWidth + 20,
        cellWidth - starsWidth - (achievementIconWidth/2) - 300
    )

const bannerGradient = createOptimizedGradient(ctx, 'achievement-banner', barX, barY, barWidth, barHeight, [
        { offset: 0, color: '#565390' },
        { offset: 1, color: '#3a3867' }
    ]);

    ctx.save();
    ctx.fillStyle = bannerGradient;
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.fill();
ctx.restore();

    ctx.save();
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.clip();
    const bannerHighlight = createOptimizedGradient(ctx, 'achievement-banner-highlight', barX, barY, barWidth, barHeight, [
        { offset: 0, color: 'rgba(255, 255, 255, 0.3)' },
        { offset: 1, color: 'rgba(255, 255, 255, 0)' }
    ]);
    ctx.fillStyle = bannerHighlight;
    ctx.fillRect(barX + 5, barY + 5, barWidth - 10, barHeight / 2);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.stroke();
    ctx.restore();

    const iconX = barX + barPadding;

    ctx.drawImage(achievementIconImage, xFromStatIcon, iconY, achievementIconWidth, achievementIconHeight);

    ctx.drawImage(starsImage, starsX, starsY, starsWidth, starsHeight);

    const textX = iconX + spacingBetween;
    const textY = iconCenterY - 30;
    clashFont(ctx, achievementTitle, iconX, textY - 55, '40', false, '#f4f2ff');
    clashFont(ctx, text, textX, textY, '60', false, '#fff6c9');
};

// for later
const personalBestBanner = async (ctx, x, y, emblemWidth, emblemHeight, bestTrophies, cellHeight) => {
    const barHeight = 80;
    const barRadius = barHeight / 5;
    const barPadding = (emblemWidth / 2) + 20;
    const spacingBetween = 20;

    const starsWidth = 288;
    const starsHeight = 115;
    const starY = y + (cellHeight / 2) - (starsHeight / 2);

    const xFromStatIcon = x + starsWidth + 70;

    const trophyLeagueEmblemPath = getTrophyLeagueImagePath(bestTrophies);
    const emblemImage = await getCachedImage(trophyLeagueEmblemPath);
    const starsImagePath = getImagePath('3star');
    const starsImage = await getCachedImage(starsImagePath);

    // Proper emblem vertical centering
    const emblemY = y + (cellHeight / 2) - (emblemHeight / 2);
    const emblemCenterY = emblemY + (emblemHeight / 2);

    // Bar Y calculation now based on corrected emblemCenterY
    const barX = xFromStatIcon + (emblemWidth / 2);
    const barY = emblemCenterY - (barHeight / 2);

    ctx.font = 'bold 60px Clash';
    const text = bestTrophies.toString();
    const textWidth = ctx.measureText(text).width;
    const barWidth = barPadding + spacingBetween + textWidth + 40;

const bannerGradient = createOptimizedGradient(ctx, 'personal-best-banner', barX, barY, barWidth, barHeight, [
        { offset: 0, color: '#565390' },
        { offset: 1, color: '#3a3867' }
    ]);

    ctx.save();
    ctx.fillStyle = bannerGradient;
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.fill();
ctx.restore();

    ctx.save();
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.clip();
    const highlight = createOptimizedGradient(ctx, 'personal-best-highlight', barX, barY, barWidth, barHeight, [
        { offset: 0, color: 'rgba(255, 255, 255, 0.3)' },
        { offset: 1, color: 'rgba(255, 255, 255, 0)' }
    ]);
    ctx.fillStyle = highlight;
    ctx.fillRect(barX + 5, barY + 5, barWidth - 10, barHeight / 2);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.stroke();
    ctx.restore();

    // Trophy icon inside bar
    const iconX = barX + barPadding;

    ctx.drawImage(emblemImage, xFromStatIcon, emblemY, emblemWidth, emblemHeight);

    // Star image centered in cell
    ctx.drawImage(starsImage, x + 30, starY, starsWidth, starsHeight);

    // Trophies text
    const textX = iconX + spacingBetween;
    const textY = emblemCenterY - 30;
    clashFont(ctx, 'Personal best:', iconX, textY - 55, '40', false, '#f4f2ff');
    clashFont(ctx, bestTrophies, textX, textY, '60', false, '#fff6c9');
};

const statBanner = async (ctx, x, y, emblemWidth, emblemHeight, imageName, stat, statBgColour = '#38385c') => {
    const emblemCenterY = y + (emblemHeight / 2);
    const barHeight = 100;
    const barRadius = barHeight / 4;
    const barPadding = 20 + (emblemWidth / 2);
    const iconSize = 60;
    const spacingBetween = 20;

    const statImagePath = getImagePath(imageName);
    const statImage = await getCachedImage(statImagePath);

    const barX = x + (emblemWidth / 2);
    const barY = emblemCenterY - (barHeight / 2);

    const text = stat.toString();
    ctx.font = 'bold 70px Clash'; 
    const textWidth = ctx.measureText(text).width;

    const barWidth = barPadding + iconSize + spacingBetween + textWidth + 80;

const barGradient = createOptimizedGradient(ctx, 'stat-banner', barX, barY, barWidth, barHeight, [
        { offset: 0, color: '#4c4985' },
        { offset: 1, color: '#2f2d56' }
    ]);

    ctx.save();
    ctx.fillStyle = barGradient;
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.fill();
ctx.restore();

    ctx.save();
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.clip();
    const barHighlight = createOptimizedGradient(ctx, 'stat-banner-highlight', barX, barY, barWidth, barHeight, [
        { offset: 0, color: 'rgba(255, 255, 255, 0.35)' },
        { offset: 1, color: 'rgba(255, 255, 255, 0)' }
    ]);
    ctx.fillStyle = barHighlight;
    ctx.fillRect(barX + 6, barY + 6, barWidth - 12, barHeight / 2);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    drawRightRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barRadius);
    ctx.stroke();
    ctx.restore();

    const iconX = barX + barPadding;
    ctx.drawImage(statImage, x, y, emblemWidth, emblemHeight);

    const textX = iconX + iconSize + spacingBetween;
    const textY = emblemCenterY - 30;
    clashFont(ctx, stat, textX, textY, '70', false, '#fff6c9');
};

const leagueTrophyBanner = async (ctx, x, y, emblemWidth, emblemHeight, trophies, league, rank) => {
    const lineStartFromEmblemX = x + (emblemWidth / 2);
    const lineEndX = x + emblemWidth + 750; 
    const emblemCenterY = y + (emblemHeight / 2);
    const line1Y = emblemCenterY - 55; 

    //check this and one below, i dont think width  and height are correct
    const gradient1 = createOptimizedGradient(ctx, 'leaguetrophybanner', x, y, emblemWidth, emblemHeight, [
        { offset: 0, color: 'rgba(0, 0, 0, 0.8)' },
        { offset: 1, color: 'rgba(0, 0, 0, 0)' }
    ]);


    ctx.beginPath();
    ctx.strokeStyle = gradient1;
    ctx.lineWidth = 90;
    ctx.moveTo(lineStartFromEmblemX, line1Y);
    ctx.lineTo(lineEndX, line1Y);
    ctx.stroke();
    ctx.closePath();

    const line2Y = emblemCenterY + 50; 
    const gradient2 = createOptimizedGradient(ctx, 'leaguetrophybanner2', x, y, emblemWidth, emblemHeight, [
        { offset: 0, color: 'rgba(118, 82, 178, 1)' },
        { offset: 0.5, color: 'rgba(101, 82, 166, 1)' },
        { offset: 1, color: 'rgba(101, 82, 166, 0)' }
    ]);
    
    ctx.beginPath();
    ctx.strokeStyle = gradient2;
    ctx.lineWidth = 110;
    ctx.moveTo(lineStartFromEmblemX, line2Y);
    ctx.lineTo(lineEndX, line2Y);
    ctx.stroke();
    ctx.closePath();

    const leagueName = league ? getLeagueName(league) : 'Unranked'
    clashFont(ctx, leagueName, lineStartFromEmblemX + 200, line1Y - 28, '55', false)

    const trophyIconPath = getImagePath('trophy')
    const trophyIconImage = await getCachedImage(trophyIconPath);
    ctx.drawImage(trophyIconImage, lineStartFromEmblemX + 200, line2Y - 45, 90, 90);

    const unrankedEmblemPath = getImagePath('Icon_HV_League_None');

    const emblemImage = league ? await getCachedImage(league.iconUrls.medium) :
        await getCachedImage(unrankedEmblemPath);

    ctx.drawImage(emblemImage, x, y, emblemWidth, emblemHeight);

    // TODO - Get Supercell to fix currentSeason.rank
    if(false) {
        const rankX = x + (emblemWidth/2)
        const rankY = y + (emblemHeight/2) + 10
        clashFontScaled(ctx, rank, rankX, rankY, emblemWidth * 0.4, emblemHeight * 0.4, true)
    }

    clashFont(ctx, trophies, lineStartFromEmblemX + 310, line2Y - 35, '85', false)
}

const dividerLine = (ctx, x1, x2, y1, y2, c1 = "#5b5f80", c2 = "#abaec1") => {

    ctx.strokeStyle = c1;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1 - 3);
    ctx.lineTo(x2, y2 - 3);
    ctx.stroke();

    ctx.strokeStyle = c2;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1-2, y1);
    ctx.lineTo(x2-2, y2);
    ctx.stroke();
}

const townhallSection = async (profile, ctx, x, y) => {
    const townhallImageWidth = 610
    const townhallLevel = profile.townHallLevel
    const townhallImagePath = getTownhallPath(townhallLevel);
    
    const shineImagePath = getImagePath('shine');

    const [townhallImage, shineImage] = await Promise.all([
        getCachedImage(townhallImagePath),
        getCachedImage(shineImagePath)
    ])

    ctx.drawImage(shineImage, x + 130, y - 150, townhallImageWidth + 400, townhallImageWidth + 400);
    ctx.drawImage(townhallImage, x + 330, y + 50, townhallImageWidth, townhallImageWidth);
}

const clanSection = async(profile, ctx, x, y) => {
    const clan = profile.clan
    const emblemWidth = 500
    const emblemHeight = 500
    
    if (clan) {
        const clanEmblem = await getCachedImage(clan.badgeUrls.medium)    
        clashFont(ctx, clan.name, x + (emblemWidth / 2), y, '75', true)
        ctx.drawImage(clanEmblem, x, y + 50, emblemWidth, emblemHeight); 
    }
    if (!clan) clashFont(ctx, 'No Clan', x + (emblemWidth / 2), y, '75', true)
}

const nameSection = async (profile, ctx, x, y) => {
    const username = profile.name
    const playerTag = profile.tag
    const clanRole = profile.role
    const league = profile?.league
    const trophies = profile.trophies
    const expLevel = profile.expLevel

    const imagePath = getImagePath('xp');

    const image = await getCachedImage(imagePath);

    ctx.drawImage(image, x, y - 10, 200, 200);

    clashFont(ctx, expLevel, x + 100, y + 90, '90', true)

    clashFont(ctx, username, x + 250, y - 30, '100', false)
    tagFont(ctx, playerTag, x + 250, y + 95, '75', false)

    if(clanRole)
        clashFont(ctx, mapClanRoles(clanRole), x + 250, y + 190, '75', false)

    const rank = profile?.legendStatistics?.currentSeason?.rank

    await leagueTrophyBanner(ctx, x + 100, y + 300, 350, 350, trophies, league, rank)
}

const achievementsSection = async (achievements, ctx, x, y) =>  {
    const goldLooted = achievements[5]
    const troopDonations = achievements[14]
    const obstaclesRemoved = achievements[3]
    const clanGamePoints = achievements[31]

    const elixirLooted = achievements[6]
    const spellDonations = achievements[23]
    const seasonChallengePts = achievements[35]
    const warStars = achievements[20]
    const successfulAttacks = achievements[12]

    const darkElixirLooted = achievements[16]
    const siegeDonations = achievements[40]
    const campaignMapStars = achievements[1]
    const clanWarLeagueStars = achievements[33]
    const successfulDefenses = achievements[13]

    await achievementCell(ctx, x, y, 'Gold looted', 'gold', goldLooted),
    await achievementCell(ctx, x, y + 225, 'Troop donations', 'troopdonation', troopDonations),
    await achievementCell(ctx, x, y + 450, 'Obstacles removed', 'obstaclesremoved', obstaclesRemoved),
    await achievementCell(ctx, x, y + 675, 'Clan games points', 'clangames', clanGamePoints),

    await achievementCell(ctx, x + 1125, y, 'Elixir looted', 'elixir', elixirLooted),
    await achievementCell(ctx, x + 1125, y + 225, 'Spell donations', 'spelldonation', spellDonations),
    await achievementCell(ctx, x + 1125, y + 450, 'Season challenge pts', 'goldpass', seasonChallengePts),
    await achievementCell(ctx, x + 1125, y + 675, 'War stars', 'warstar', warStars),
    await achievementCell(ctx, x + 1125, y + 900, 'Successful attacks', 'multiplayerattack', successfulAttacks),
        
    await achievementCell(ctx, x + 2250, y, 'Dark elixir looted', 'darkelixir', darkElixirLooted),
    await achievementCell(ctx, x + 2250, y + 225, 'Siege donations', 'siegemachinedonation', siegeDonations),
    await achievementCell(ctx, x + 2250, y + 450, 'Campaign map stars', 'campaigner', campaignMapStars),
    await achievementCell(ctx, x + 2250, y + 675, 'Clan war league stars', 'cwlstar', clanWarLeagueStars),
    await achievementCell(ctx, x + 2250, y + 900, 'Successful defenses', 'shield', successfulDefenses)

    await signature(ctx, x + 100, y + 850, 6)
}

const achievementCell = async (ctx, x, y, achievementTitle, achievementIcon, achievement) => {
    const width = 1100;
    const height = 200;
    const radius = 30;

    const gradient = createOptimizedGradient(ctx, 'achievementcell', x, y, width, height, [
        { offset: 0, color: '#b8bfd2' },
        { offset: 0.6, color: '#a8afc7' },
        { offset: 1, color: '#9099b7' }
    ]);

withCardShadow(ctx, () => {
    ctx.fillStyle = gradient;
drawRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
}, { blur: 35, offsetY: 20, color: 'rgba(31, 26, 56, 0.25)' });

    addCardHighlight(ctx, x, y, width, height, radius, 0.28);
    drawCardOutline(ctx, x, y, width, height, radius, 'rgba(255, 255, 255, 0.55)', 4);

    reflection(ctx, x + 25, y + 25, width - 50, (height / 2) - 25);

    await achievementBanner(ctx, x, y, height, width, achievementTitle, achievementIcon, achievement);
}

const reflection = (ctx, x, y, width, height) => {
    const radius = 20
    drawRoundedRectPath(ctx, x, y, width, height, radius)

    const gradient = createOptimizedGradient(ctx, 'reflection', x, y, width, height, [
        { offset: 0, color: 'rgba(255, 255, 255, 0.25)' },
        { offset: 1, color: 'rgba(255, 255, 255, 0.1)' }
    ]);
    ctx.fillStyle = gradient;
    ctx.fill();
}

module.exports = { getProfileImage };
