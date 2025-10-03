'use strict';

const path = require('path');
const { createCanvas, registerFont } = require('canvas');

const {
  drawRoundedRectPath,
  getFontPath,
  getCachedImage,
  createOptimizedGradient,
  setupCanvasContext,
  autoThrottleCacheClear,
} = require('./shared');

registerFont(getFontPath('Clash_Regular'), { family: 'ClashFont' });

const ICON_BASE_PATH = path.join(__dirname, '..', 'assets', 'images', 'coc', 'icons');

const HERO_ICON_MAP = {
  barbarianking: 'Icon_HV_Hero_Barbarian_King.png',
  archerqueen: 'Icon_HV_Hero_Archer_Queen.png',
  grandwarden: 'Icon_HV_Hero_Grand_Warden.png',
  royalchampion: 'Icon_HV_Hero_Royal_Champion.png',
  minionprince: 'Icon_HV_Hero_Minion_Prince.png',
};

const EQUIPMENT_ICON_MAP = {
  barbarianpuppet: 'Hero_Equipment_BK_Barbarian_Puppet.png',
  earthquakeboots: 'Hero_Equipment_BK_Earthquake_Boots.png',
  giantgauntlet: 'Hero_Equipment_BK_Giant_Gauntlet.png',
  snakebracelet: 'Hero_Equipment_BK_Snake_Bracelet.png',
  ragevial: 'Hero_Equipment_BK_Rage_Vial.png',
  spikyball: 'Hero_Equipment_BK_Spiky_Ball.png',
  vampstache: 'Hero_Equipment_BK_Vampstache.png',
  metalpants: 'Hero_Equipment_MP_Metal_Pants.png',
  nobleiron: 'Hero_Equipment_MP_Noble_Iron.png',
  heroictorch: 'Hero_Equipment_MP_Heroic_Torch.png',
  heroictorchmp: 'Hero_Equipment_MP_Heroic_Torch.png',
  henchman: 'Hero_Equipment_MP_Henchman.png',
  darkcrown: 'Hero_Equipment_MP_Dark_Crown.png',
  darkcrownmp: 'HeroGear_MP_DarkCrown_2k.png',
  darkorb: 'Hero_Equipment_MP_Dark_Orb.png',

  archerpuppet: 'Hero_Equipment_AQ_Archer_Puppet.png',
  frozenarrow: 'Hero_Equipment_AQ_Frozen_Arrow.png',
  giantarrow: 'Hero_Equipment_AQ_Giant_Arrow.png',
  healerpuppet: 'Hero_Equipment_AQ_Healer_Puppet.png',
  invisibilityvial: 'Hero_Equipment_AQ_Invisibility_Vial.png',
  magicmirror: 'Hero_Equipment_AQ_Magic_Mirror.png',
  actionfigure: 'Hero_Equipment_AQ_WWEActionFigure.png',

  eternaltome: 'Hero_Equipment_GW_Eternal_Tome.png',
  fireball: 'Hero_Equipment_GW_Fireball.png',
  healingtome: 'Hero_Equipment_GW_Healing_Tome.png',
  lavaloonpuppet: 'Hero_Equipment_GW_Lavaloon_Puppet.png',
  lifegem: 'Hero_Equipment_GW_Life_Gem.png',
  ragegem: 'Hero_Equipment_GW_Rage_Gem.png',

  electroboots: 'Hero_Equipment_RC_Electro_Boots.png',
  hastevial: 'Hero_Equipment_RC_Haste_Vial.png',
  hogriderdoll: 'Hero_Equipment_RC_Hog_Rider_Doll.png',
  rocketspear: 'Hero_Equipment_RC_Rocket_Spear.png',
  royalgem: 'Hero_Equipment_RC_Royal_Gem.png',
  seekingshield: 'Hero_Equipment_RC_Seeking_Shield.png',
};

const HERO_ORDER = [
  'Barbarian King',
  'Archer Queen',
  'Grand Warden',
  'Royal Champion',
  'Minion Prince',
];

const CARD_WIDTH = 540;
const CARD_PADDING_X = 32;
const CARD_PADDING_Y = 32;
const HERO_ICON_SIZE = 156;
const EQUIPMENT_ICON_SIZE = 70;
const EQUIPMENT_ROW_HEIGHT = 94;
const HERO_META_SPACING = 20;

const normalizeKey = (value) => {
  if (!value) return '';
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const getHeroIconPath = (name) => {
  const key = normalizeKey(name);
  const fileName = HERO_ICON_MAP[key];
  return fileName ? path.join(ICON_BASE_PATH, 'heroes', fileName) : null;
};

const getEquipmentIconPath = (name) => {
  const key = normalizeKey(name);
  if (!key) return null;
  if (EQUIPMENT_ICON_MAP[key]) return path.join(ICON_BASE_PATH, 'equipment', EQUIPMENT_ICON_MAP[key]);
  if (key.startsWith('darkcrown')) return path.join(ICON_BASE_PATH, 'equipment', EQUIPMENT_ICON_MAP.darkcrown);
  if (key.startsWith('heroictorch')) return path.join(ICON_BASE_PATH, 'equipment', EQUIPMENT_ICON_MAP.heroictorch);
  return null;
};

const measureGoldPill = (ctx, text, options = {}) => {
  const paddingX = options.paddingX ?? 12;
  const paddingY = options.paddingY ?? 6;
  const fontSize = options.fontSize ?? 22;
  ctx.save();
  ctx.font = `bold ${fontSize}px ClashFont`;
  const width = Math.ceil(ctx.measureText(text).width + paddingX * 2);
  const height = Math.ceil(fontSize + paddingY * 2);
  ctx.restore();
  return { width, height };
};

const drawGoldPill = (ctx, text, x, y, options = {}) => {
  const paddingX = options.paddingX ?? 12;
  const paddingY = options.paddingY ?? 6;
  const fontSize = options.fontSize ?? 22;
  const radius = options.radius ?? 16;
  const fill = options.fill ?? '#2A1F0F';
  const stroke = options.stroke ?? '#F3C870';

  ctx.save();
  ctx.font = `bold ${fontSize}px ClashFont`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width + paddingX * 2);
  const height = Math.ceil(fontSize + paddingY * 2);

  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();

  ctx.fillStyle = '#F9EFD2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);
  ctx.restore();

  return { width, height };
};

const measureCardHeight = (hero) => {
  const equipmentCount = Array.isArray(hero?.equipment) ? hero.equipment.length : 0;
  const rows = Math.max(1, equipmentCount);
  return CARD_PADDING_Y + HERO_ICON_SIZE + HERO_META_SPACING + 60 + rows * EQUIPMENT_ROW_HEIGHT + 60;
};

const drawEquipmentEntry = async (ctx, item, x, y, maxWidth) => {
  const iconPath = getEquipmentIconPath(item?.name);
  ctx.save();
  drawRoundedRectPath(ctx, x, y, EQUIPMENT_ICON_SIZE, EQUIPMENT_ICON_SIZE, 16);
  ctx.fillStyle = 'rgba(12, 18, 33, 0.9)';
  ctx.fill();
  ctx.restore();

  if (iconPath) {
    try {
      const image = await getCachedImage(iconPath);
      ctx.drawImage(image, x + 4, y + 4, EQUIPMENT_ICON_SIZE - 8, EQUIPMENT_ICON_SIZE - 8);
    } catch (error) {
      console.error(`Failed to load equipment icon for ${item?.name}`, error);
    }
  }

  const level = Number.isFinite(Number(item?.level)) ? Number(item.level) : null;
  let pillWidth = 0;
  if (level !== null) {
    const pill = drawGoldPill(ctx, `Lv ${level}`, x + EQUIPMENT_ICON_SIZE + 16, y + (EQUIPMENT_ICON_SIZE - 42) / 2, {
      fontSize: 20,
      paddingX: 10,
      paddingY: 4,
      radius: 12,
      fill: '#1F86FF',
      stroke: 'rgba(255,255,255,0.7)',
    });
    pillWidth = pill.width + 16;
  }

  const textX = x + EQUIPMENT_ICON_SIZE + 16 + pillWidth;
  const textY = y + EQUIPMENT_ICON_SIZE / 2;
  ctx.font = '22px ClashFont';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(item?.name || 'Unknown', textX, textY, Math.max(0, maxWidth - (textX - x)));
};

const drawHeroCard = async (ctx, hero, x, y, width) => {
  const cardHeight = measureCardHeight(hero);

  const gradient = createOptimizedGradient(
    ctx,
    `hero-card-${hero?.name || 'unknown'}`,
    x,
    y,
    width,
    cardHeight,
    [
      { offset: 0, color: 'rgba(43, 53, 86, 0.95)' },
      { offset: 1, color: 'rgba(22, 29, 52, 0.95)' },
    ],
  );

  drawRoundedRectPath(ctx, x, y, width, cardHeight, 30);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  drawRoundedRectPath(ctx, x, y, width, cardHeight, 30);
  ctx.stroke();

  const iconX = x + CARD_PADDING_X;
  const iconY = y + CARD_PADDING_Y;
  const iconPath = getHeroIconPath(hero.name);
  if (iconPath) {
    try {
      const heroImage = await getCachedImage(iconPath);
      ctx.save();
      drawRoundedRectPath(ctx, iconX, iconY, HERO_ICON_SIZE, HERO_ICON_SIZE, 20);
      ctx.clip();
      ctx.drawImage(heroImage, iconX, iconY, HERO_ICON_SIZE, HERO_ICON_SIZE);
      ctx.restore();
    } catch (error) {
      console.error(`Failed to load hero icon for ${hero.name}`, error);
    }
  }

  const textStartX = iconX + HERO_ICON_SIZE + 32;
  const availableTextWidth = width - textStartX - CARD_PADDING_X;

  const name = hero.name || 'Unknown Hero';
  let fontSize = 40;
  ctx.font = `${fontSize}px ClashFont`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  while (ctx.measureText(name).width > availableTextWidth && fontSize > 24) {
    fontSize -= 1;
    ctx.font = `${fontSize}px ClashFont`;
  }
  ctx.fillStyle = '#F5F7FF';
  ctx.fillText(name, textStartX, iconY);

  const nameLineHeight = fontSize + 8;
  const level = Number.isFinite(Number(hero.level)) ? Number(hero.level) : null;
  if (level !== null) {
    const pill = measureGoldPill(ctx, `Lv ${level}`, { fontSize: 22, paddingX: 12, paddingY: 6 });
    let pillX = textStartX + ctx.measureText(name).width + 24;
    let pillY = iconY;
    if (pillX + pill.width > x + width - CARD_PADDING_X) {
      pillX = textStartX;
      pillY = iconY + nameLineHeight;
    }
    drawGoldPill(ctx, `Lv ${level}`, pillX, pillY, {
      fontSize: 22,
      paddingX: 12,
      paddingY: 6,
      radius: 16,
    });
  }

  const metaY = iconY + nameLineHeight * 2;
  const village = hero.village ? hero.village.toLowerCase() : 'home';
  const villageLabel = village === 'builderbase' ? 'builderBase' : 'home';
  const maxLevel = Number.isFinite(Number(hero.maxLevel)) ? Number(hero.maxLevel) : null;
  const metaParts = [`Village: ${villageLabel}`];
  if (maxLevel !== null) metaParts.push(`Max Level: ${maxLevel}`);
  ctx.font = '24px ClashFont';
  ctx.fillStyle = 'rgba(240,242,255,0.82)';
  ctx.fillText(metaParts.join(' • '), textStartX, metaY);

  const equipmentStartY = iconY + HERO_ICON_SIZE + HERO_META_SPACING + 26;
  const equipment = Array.isArray(hero.equipment) ? hero.equipment : [];

  if (!equipment.length) {
    ctx.font = '24px ClashFont';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('No equipment unlocked', textStartX, equipmentStartY);
    return cardHeight;
  }

  for (let index = 0; index < equipment.length; index++) {
    const rowY = equipmentStartY + index * EQUIPMENT_ROW_HEIGHT;
    await drawEquipmentEntry(ctx, equipment[index], iconX, rowY, width - CARD_PADDING_X * 2);
  }

  return cardHeight;
};

const getHeroShowcaseImage = async (profile, key) => {
  const heroes = Array.isArray(profile.heroes)
    ? profile.heroes.filter((hero) => (hero?.village || '').toLowerCase() !== 'builderbase')
    : [];

  const orderedHeroes = [];
  HERO_ORDER.forEach((name) => {
    const match = heroes.find((hero) => hero.name === name);
    if (match) orderedHeroes.push(match);
  });
  heroes.forEach((hero) => {
    if (!orderedHeroes.includes(hero)) orderedHeroes.push(hero);
  });

  const heroCount = orderedHeroes.length;
  const perRow = heroCount ? Math.min(heroCount, 3) : 1;

  const cardHeights = heroCount ? orderedHeroes.map(measureCardHeight) : [measureCardHeight(null)];
  const rowHeights = [];
  for (let index = 0; index < heroCount; index++) {
    const row = Math.floor(index / perRow);
    rowHeights[row] = Math.max(rowHeights[row] || 0, cardHeights[index]);
  }

  const marginX = 120;
  const marginY = 140;
  const gapX = heroCount > 1 ? 70 : 0;
  const gapY = 90;

  const width = Math.max(
    1900,
    marginX * 2 + perRow * CARD_WIDTH + (perRow - 1) * gapX,
  );

  const contentHeight = rowHeights.length
    ? rowHeights.reduce((sum, h) => sum + h, 0) + (rowHeights.length - 1) * gapY
    : cardHeights[0];
  const height = Math.max(1100, marginY * 2 + contentHeight + 240);

  const rowStartY = [];
  let cursorY = marginY;
  for (let row = 0; row < rowHeights.length; row++) {
    rowStartY[row] = cursorY;
    cursorY += rowHeights[row] + gapY;
  }

  const canvas = createCanvas(width, height);
  const ctx = setupCanvasContext(canvas.getContext('2d'));

  const background = createOptimizedGradient(
    ctx,
    'hero-showcase-background',
    0,
    0,
    width,
    height,
    [
      { offset: 0, color: '#1a2040' },
      { offset: 1, color: '#0b1030' },
    ],
  );
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  if (!heroCount) {
    ctx.font = '52px ClashFont';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.fillText('No hero data available', width / 2, height / 2);
  } else {
    for (let index = 0; index < orderedHeroes.length; index++) {
      const hero = orderedHeroes[index];
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      const cardX = marginX + col * (CARD_WIDTH + gapX);
      const cardY = rowStartY[row];
      await drawHeroCard(ctx, hero, cardX, cardY, CARD_WIDTH);
    }
  }

  const brandingText = 'Clashvip';
  ctx.save();
  ctx.font = 'bold 82px ClashFont';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 12;
  ctx.fillText(brandingText, width / 2, height - 70);
  ctx.shadowBlur = 0;
  ctx.restore();

  autoThrottleCacheClear();

  const buffer = canvas.toBuffer('image/png');
  const fileName = `player-heroes-${key}.png`;
  return { buffer, fileName };
};

module.exports = {
  getHeroShowcaseImage,
};
