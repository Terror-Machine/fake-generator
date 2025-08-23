const fs = require('fs');
const path = require('path');
const emojiImageByBrandPromise = require('emoji-cache');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { parseTextToSegments, rebuildLinesFromSegments, getContrastColor } = require('./utils.js');
registerFont(path.join(__dirname, '../assets/fonts/SpicyRice.otf'), { family: 'SpicyRice' });

function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
};
async function generateFakeStory(options = {}) {
  const allEmojiImages = await emojiImageByBrandPromise;
  const emojiCache = allEmojiImages["apple"] || {};
  const {
    caption,
    username,
    profilePicBuffer,
    backgroundPath = path.join(__dirname, '..', 'assets', 'fakestory.png')
  } = options;
  if (!caption || !username || !profilePicBuffer) throw new Error("Caption, username, dan profilePicBuffer wajib diisi.");
  const bg = await loadImage(backgroundPath);
  const pp = await loadImage(profilePicBuffer);
  const canvas = createCanvas(bg.width, bg.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  const ppX = 40;
  const ppY = 250;
  const ppSize = 70;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ppX + ppSize / 2, ppY + ppSize / 2, ppSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(pp, ppX, ppY, ppSize, ppSize);
  ctx.restore();
  ctx.font = '28px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const usernameX = ppX + ppSize + 15;
  const usernameY = ppY + ppSize / 2;
  ctx.fillText(username, usernameX, usernameY);
  const padding = 60;
  const maxWidth = canvas.width - padding * 2;
  const maxHeight = 500;
  let fontSize = 42;
  let finalLines = [];
  let lineHeight = 0;
  let finalFontSize = 0;
  while (fontSize > 10) {
    ctx.font = `${fontSize}px Arial`;
    const segments = parseTextToSegments(caption, ctx, fontSize);
    const lines = rebuildLinesFromSegments(segments, maxWidth, ctx, fontSize);
    let isTooWide = false;
    for (const line of lines) {
      const lineWidth = line.reduce((sum, seg) => sum + seg.width, 0);
      if (lineWidth > maxWidth) {
        isTooWide = true;
        break;
      }
    }
    const currentLineHeight = fontSize * 1.3;
    const totalHeight = lines.length * currentLineHeight;
    if (totalHeight <= maxHeight && !isTooWide) {
      finalLines = lines;
      lineHeight = currentLineHeight;
      finalFontSize = fontSize;
      break;
    }
    fontSize -= 2;
  }
  ctx.textBaseline = 'top';
  const captionX = canvas.width / 2;
  const totalTextHeight = finalLines.length * lineHeight;
  const startY = (canvas.height / 2) - (totalTextHeight / 2) + 50;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2, finalFontSize / 15);
  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i];
    const totalLineWidth = line.reduce((sum, seg) => sum + seg.width, 0);
    let currentX = captionX - (totalLineWidth / 2);
    const currentLineY = startY + (i * lineHeight);
    for (const segment of line) {
      ctx.fillStyle = '#FFFFFF';
      switch (segment.type) {
        case 'bold':
          ctx.font = `bold ${finalFontSize}px Arial`;
          ctx.fillText(segment.content, currentX, currentLineY);
          break;
        case 'italic':
          ctx.font = `italic ${finalFontSize}px Arial`;
          ctx.fillText(segment.content, currentX, currentLineY);
          break;
        case 'bolditalic':
          ctx.font = `italic bold ${finalFontSize}px Arial`;
          ctx.fillText(segment.content, currentX, currentLineY);
          break;
        case 'monospace':
          ctx.font = `${finalFontSize}px 'Courier New', monospace`;
          ctx.fillText(segment.content, currentX, currentLineY);
          break;
        case 'strikethrough':
          ctx.font = `${finalFontSize}px Arial`;
          ctx.fillText(segment.content, currentX, currentLineY);
          const strikeY = currentLineY + finalFontSize / 2;
          ctx.beginPath();
          ctx.moveTo(currentX, strikeY);
          ctx.lineTo(currentX + segment.width, strikeY);
          ctx.stroke();
          break;
        case 'emoji':
          const emojiImg = await loadImage(Buffer.from(emojiCache[segment.content], 'base64'));
          const emojiDrawY = currentLineY + (lineHeight - finalFontSize) / 2;
          ctx.drawImage(emojiImg, currentX, emojiDrawY, finalFontSize, finalFontSize);
          break;
        case 'text':
        case 'whitespace':
        default:
          ctx.font = `${finalFontSize}px Arial`;
          ctx.fillText(segment.content, currentX, currentLineY);
          break;
      }
      currentX += segment.width;
    }
  }
  return canvas.toBuffer('image/png');
};
async function generateFakeTweet(options = {}) {
  const allEmojiImages = await emojiImageByBrandPromise;
  const emojiCache = allEmojiImages["apple"] || {};
  const {
    comment = "Ini adalah contoh tweet *tebal* dan _miring_.\nJuga ~salah~ dan ```monospace```. ✨",
    user = { displayName: "Pengembang Handal", username: "js_master" },
    avatarUrl = path.join(__dirname, '..', 'assets', 'fotobot.jpeg'),
    verified = false,
    backgroundColor = '#15202b',
    font = { name: "Chirp", path: null }
  } = options;
  try {
    const textColor = getContrastColor(backgroundColor);
    const mutedColor = (textColor === '#FFFFFF') ? '#8493a2' : '#536471';
    const lineColor = (textColor === '#FFFFFF') ? '#38444d' : '#cfd9de';
    if (font.path && fs.existsSync(font.path)) {
      registerFont(font.path, { family: font.name });
    } else {
      const defaultFontPath = path.join(__dirname, '..', 'assets', 'fonts', 'Chirp-Regular.ttf');
      if (fs.existsSync(defaultFontPath)) {
        registerFont(defaultFontPath, { family: "Chirp" });
      }
    }
    const tempCtx = createCanvas(1, 1).getContext('2d');
    const commentFontSize = 25;
    const commentLineHeight = 40;
    const commentMaxWidth = 800;
    tempCtx.font = `${commentFontSize}px "${font.name}"`;
    const segments = parseTextToSegments(comment, tempCtx, commentFontSize);
    const commentLines = rebuildLinesFromSegments(segments, commentMaxWidth, tempCtx, commentFontSize);
    const totalCommentHeight = commentLines.length * commentLineHeight;
    const baseHeight = 240;
    const finalHeight = baseHeight + totalCommentHeight;
    const canvas = createCanvas(968, finalHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.font = `bold 25px "${font.name}"`;
    ctx.fillText(user.displayName, 130, 70);
    if (verified) {
      const textLength = ctx.measureText(user.displayName).width;
      const verifiedIcon = await loadImage(path.join(__dirname, '..', 'assets', 'tweet', 'twitter-verified.png'));
      ctx.drawImage(verifiedIcon, textLength + 140, 48, 30, 30);
    }
    ctx.font = `25px "${font.name}"`;
    ctx.fillStyle = mutedColor;
    ctx.fillText("@" + user.username, 130, 100);
    ctx.textBaseline = 'middle';
    const commentStartX = 85;
    const commentStartY = 150;
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < commentLines.length; i++) {
      const line = commentLines[i];
      const lineCenterY = commentStartY + (i * commentLineHeight) + (commentLineHeight / 2);
      let currentX = commentStartX;
      for (const segment of line) {
        ctx.fillStyle = textColor;
        switch (segment.type) {
          case 'bold':
            ctx.font = `bold ${commentFontSize}px Arial`;
            ctx.fillText(segment.content, currentX, lineCenterY);
            break;
          case 'italic':
            ctx.font = `italic ${commentFontSize}px Arial`;
            ctx.fillText(segment.content, currentX, lineCenterY);
            break;
          case 'bolditalic':
            ctx.font = `italic bold ${commentFontSize}px Arial`;
            ctx.fillText(segment.content, currentX, lineCenterY);
            break;
          case 'monospace':
            ctx.font = `${commentFontSize}px 'Courier New', monospace`;
            ctx.fillText(segment.content, currentX, lineCenterY);
            break;
          case 'strikethrough':
            ctx.font = `${commentFontSize}px Arial`;
            ctx.fillText(segment.content, currentX, lineCenterY);
            const strikeY = lineCenterY;
            ctx.beginPath();
            ctx.moveTo(currentX, strikeY);
            ctx.lineTo(currentX + segment.width, strikeY);
            ctx.stroke();
            break;
          case 'emoji':
            const emojiImg = await loadImage(Buffer.from(emojiCache[segment.content], 'base64'));
            const emojiY = lineCenterY - (commentFontSize / 2);
            ctx.drawImage(emojiImg, currentX, emojiY, commentFontSize, commentFontSize);
            break;
          case 'text':
          case 'whitespace':
          default:
            ctx.font = `${commentFontSize}px Arial`;
            ctx.fillText(segment.content, currentX, lineCenterY);
            break;
        }
        currentX += segment.width;
      }
    }
    const footerY = canvas.height - 88;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, footerY);
    ctx.lineTo(canvas.width - 50, footerY);
    ctx.stroke();
    try {
      const iconPath = (iconName) => path.join(__dirname, '..', 'assets', 'tweet', iconName);
      const iconY = canvas.height - 68;
      ctx.drawImage(await loadImage(iconPath('reply.png')), 186.6, iconY, 45, 45);
      ctx.drawImage(await loadImage(iconPath('retweet.png')), 384, iconY, 45, 45);
      ctx.drawImage(await loadImage(iconPath('like.png')), 577.8, iconY, 45, 45);
      ctx.drawImage(await loadImage(iconPath('share.png')), 771, iconY, 45, 45);
      ctx.drawImage(await loadImage(iconPath('other.png')), 900, 40, 35, 35);
    } catch (err) {
      console.error("Gagal memuat ikon tweet:", err.message);
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(80, 75, 40, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const avatarImg = await loadImage(avatarUrl);
    ctx.drawImage(avatarImg, 40, 35, 80, 80);
    ctx.restore();
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error("Gagal membuat kartu Tweet:", error);
    return null;
  }
};
async function generateFakeChatIphone(options = {}) {
  const allEmojiImages = await emojiImageByBrandPromise;
  const emojiCache = allEmojiImages["apple"] || {};
  const {
    text = "Ini adalah *contoh* IQC.\nMendukung _semua_ format ~Markdown~. ✨",
    chatTime = "11:02",
    statusBarTime = "17:01",
    bubbleColor = '#272a2f',
    menuColor = '#272a2f',
    textColor = '#FFFFFF',
    fontName = "Arial"
  } = options;
  try {
    const canvasWidth = 1320;
    const canvasHeight = 2868;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    const iconPath = (iconName) => path.join(__dirname, '..', 'assets', 'iphone', iconName);
    const backgroundImage = await loadImage(iconPath('background.jpg'));
    ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = textColor;
    ctx.font = `bold 50px "${fontName}"`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(statusBarTime, 40, 80);
    const statusIconY = 60;
    const statusIconSize = 55;
    const rightMargin = 40;
    const iconSpacing = 20;
    let currentX_status = canvasWidth - rightMargin - statusIconSize;
    ctx.drawImage(await loadImage(iconPath('battery.png')), currentX_status, (statusIconY - 10), statusIconSize, (statusIconSize * 1.5));
    currentX_status -= (statusIconSize + iconSpacing);
    ctx.drawImage(await loadImage(iconPath('wifi.png')), currentX_status, statusIconY, statusIconSize, statusIconSize);
    currentX_status -= (statusIconSize + iconSpacing);
    ctx.drawImage(await loadImage(iconPath('signal.png')), currentX_status, statusIconY, statusIconSize, statusIconSize);
    const startX = 40;
    const bubbleSpacing = 20;
    const emojiString = '👍❤️😂😮😢🙏🤔';
    const emojiFontSize = 65;
    const plusIconSize = 115;
    const emojiPadding = 15;
    ctx.font = `${emojiFontSize}px "${fontName}"`;
    const emojiSegments = parseTextToSegments(emojiString, ctx, emojiFontSize);
    let emojiContentWidth = emojiSegments.reduce((sum, seg) => sum + seg.width + 20, 0);
    emojiContentWidth += plusIconSize + 20;
    const bubble1Width = emojiContentWidth + (emojiPadding * 2) - 20;
    const bubble1Height = 110;
    const textFontSize = 52;
    const textLineHeight = textFontSize * 1.4;
    const textMaxWidth = canvasWidth - startX - 40;
    const bubblePadding = 40;
    ctx.font = `bold ${textFontSize}px "${fontName}"`;
    const textSegments = parseTextToSegments(text, ctx, textFontSize);
    const textLines = rebuildLinesFromSegments(textSegments, textMaxWidth - (bubblePadding * 2), ctx, textFontSize);
    let bubble2Width;
    if (textLines.length === 1) {
      const singleLineWidth = textLines[0].reduce((sum, seg) => sum + seg.width, 0);
      bubble2Width = singleLineWidth + (bubblePadding * 2);
    } else {
      bubble2Width = textMaxWidth;
    }
    const bubble2Height = (textLines.length * textLineHeight) + (bubblePadding * 2);
    const menuItems = [
      { text: 'Reply', icon: 'reply.png' }, { text: 'Forward', icon: 'forward.png' },
      { text: 'Copy', icon: 'copy.png' }, { text: 'Star', icon: 'star.png' },
      { text: 'Pin', icon: 'pin.png' }, { text: 'Report', icon: 'report.png' },
      { text: 'Delete', icon: 'delete.png', color: '#ff453a' }
    ];
    const menuItemHeight = 110;
    const bubble3Width = (canvasWidth * 4 / 9) - startX;
    const bubble3Height = menuItems.length * menuItemHeight;
    const sequentialBlockHeight = bubble1Height + bubbleSpacing + bubble2Height;
    const centeredY = (canvasHeight - sequentialBlockHeight) / 2;
    const topLimitY = 200;
    const startY = Math.max(centeredY, topLimitY);
    const bubble1Y = startY;
    const bubble2Y = bubble1Y + bubble1Height + bubbleSpacing;
    let bubble3Y;
    const bottomLimitY = canvasHeight - 100;
    const normal_bubble3Y = bubble2Y + bubble2Height + bubbleSpacing;
    if (normal_bubble3Y + bubble3Height >= bottomLimitY) {
      bubble3Y = bottomLimitY - bubble3Height;
    } else {
      bubble3Y = normal_bubble3Y;
    }
    ctx.fillStyle = menuColor;
    drawRoundRect(ctx, startX, bubble1Y, bubble1Width, bubble1Height, 60);
    ctx.fill();
    let currentEmojiX = startX + emojiPadding;
    for (const segment of emojiSegments) {
      const emojiImg = await loadImage(Buffer.from(emojiCache[segment.content], 'base64'));
      ctx.drawImage(emojiImg, currentEmojiX, bubble1Y + (bubble1Height - emojiFontSize) / 2, emojiFontSize, emojiFontSize);
      currentEmojiX += segment.width + 20;
    }
    ctx.drawImage(await loadImage(iconPath('plus.png')), currentEmojiX, bubble1Y + (bubble1Height - plusIconSize) / 2, plusIconSize, plusIconSize);
    ctx.fillStyle = bubbleColor;
    drawRoundRect(ctx, startX, bubble2Y, bubble2Width, bubble2Height, 45);
    ctx.fill();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 3;
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];
      let currentTextX = startX + bubblePadding;
      const lineY = bubble2Y + bubblePadding + (i * textLineHeight);
      ctx.textBaseline = 'top';
      for (const segment of line) {
        ctx.fillStyle = textColor;
        switch (segment.type) {
          case 'bold':
            ctx.font = `bold ${textFontSize}px "${fontName}"`;
            ctx.fillText(segment.content, currentTextX, lineY);
            break;
          case 'italic':
            ctx.font = `italic ${textFontSize}px "${fontName}"`;
            ctx.fillText(segment.content, currentTextX, lineY);
            break;
          case 'bolditalic':
            ctx.font = `italic bold ${textFontSize}px "${fontName}"`;
            ctx.fillText(segment.content, currentTextX, lineY);
            break;
          case 'monospace':
            ctx.font = `${textFontSize}px 'Courier New', monospace`;
            ctx.fillText(segment.content, currentTextX, lineY);
            break;
          case 'strikethrough':
            ctx.font = `${textFontSize}px "${fontName}"`;
            ctx.fillText(segment.content, currentTextX, lineY);
            const strikeY = lineY + textFontSize / 2;
            ctx.beginPath();
            ctx.moveTo(currentTextX, strikeY);
            ctx.lineTo(currentTextX + segment.width, strikeY);
            ctx.stroke();
            break;
          case 'emoji':
            const emojiImg = await loadImage(Buffer.from(emojiCache[segment.content], 'base64'));
            ctx.drawImage(emojiImg, currentTextX, lineY, textFontSize, textFontSize);
            break;
          case 'text':
          case 'whitespace':
          default:
            ctx.font = `${textFontSize}px "${fontName}"`;
            ctx.fillText(segment.content, currentTextX, lineY);
            break;
        }
        currentTextX += segment.width;
      }
    }
    ctx.fillStyle = '#a0a0a0';
    ctx.font = `34px "${fontName}"`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(chatTime, startX + bubble2Width - (bubblePadding / 1.5), bubble2Y + bubble2Height - (bubblePadding / 8));
    ctx.fillStyle = 'rgba(39, 42, 47, 0.85)';
    drawRoundRect(ctx, startX, bubble3Y, bubble3Width, bubble3Height, 40);
    ctx.fill();
    for (let i = 0; i < menuItems.length; i++) {
      const item = menuItems[i];
      const itemY = bubble3Y + (i * menuItemHeight);
      ctx.fillStyle = item.color || textColor;
      ctx.font = `50px "${fontName}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.text, startX + 40, itemY + menuItemHeight / 2);
      const itemIcon = await loadImage(iconPath(item.icon));
      const iconSize = 55;
      const iconX = startX + bubble3Width - 40 - iconSize;
      ctx.drawImage(itemIcon, iconX, itemY + (menuItemHeight - iconSize) / 2, iconSize, iconSize);
      if (i < menuItems.length - 1) {
        const lineY = itemY + menuItemHeight;
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX + 40, lineY);
        ctx.lineTo(startX + bubble3Width - 40, lineY);
        ctx.stroke();
      }
    }
    const indicatorWidth = 450;
    const indicatorHeight = 15;
    const indicatorX = (canvasWidth - indicatorWidth) / 2;
    const indicatorY = canvasHeight - indicatorHeight - 20;
    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, indicatorX, indicatorY, indicatorWidth, indicatorHeight, indicatorHeight / 2);
    ctx.fill();
    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error("Gagal membuat gambar quote:", error);
    return null;
  }
}
async function generateMeme(baseImagePath, topText, bottomText, options = {}) {
  let img = await loadImage(baseImagePath);
  let targetWidth = img.width;
  let targetHeight = img.height;
  if (options.square) {
    const size = Math.min(img.width, img.height);
    const offsetX = (img.width - size) / 2;
    const offsetY = (img.height - size) / 2;
    const squareCanvas = createCanvas(size, size);
    const squareCtx = squareCanvas.getContext("2d");
    squareCtx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
    img = await loadImage(squareCanvas.toBuffer());
    targetWidth = targetHeight = size;
  }
  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const fontSize = options.fontSize || 65;
  const maxWidth = canvas.width - 20;
  const allEmojiImages = await emojiImageByBrandPromise;
  const emojiCache = allEmojiImages["apple"] || {};
  async function renderTextWithEmoji(text, y, fromBottom = false) {
    const segments = parseTextToSegments(text, ctx, fontSize);
    const lines = rebuildLinesFromSegments(segments, maxWidth, ctx, fontSize);
    const lineHeight = fontSize + 5;
    let totalHeight = lines.length * lineHeight;
    let currentY;
    if (fromBottom) {
      currentY = canvas.height - y - totalHeight + fontSize;
    } else {
      currentY = y;
    }
    for (const line of lines) {
      let currentX = (canvas.width - line.reduce((a, s) => a + s.width, 0)) / 2;
      for (const segment of line) {
        if (segment.type === 'emoji') {
          const base64 = emojiCache[segment.content];
          if (base64) {
            const emojiImg = await loadImage(Buffer.from(base64, 'base64'));
            const emojiYOffset = fontSize * 0.75;
            ctx.drawImage(emojiImg, currentX, currentY - emojiYOffset, fontSize, fontSize);
          } else {
            ctx.fillStyle = "white";
            ctx.fillText(segment.content, currentX, currentY);
          }
        } else {
          ctx.font = `${fontSize}px "SpicyRice"`;
          ctx.fillStyle = "white";
          ctx.strokeStyle = "black";
          ctx.lineWidth = 4;
          ctx.strokeText(segment.content, currentX, currentY);
          ctx.fillText(segment.content, currentX, currentY);
        }
        currentX += segment.width;
      }
      currentY += lineHeight;
    }
  }
  await renderTextWithEmoji(topText, options.topPadding || fontSize + 40, false);
  await renderTextWithEmoji(bottomText, options.bottomPadding || 50, true);
  return canvas.toBuffer();
}
async function generateQuote(baseImagePath, text, options = {}) {
  const img = await loadImage(baseImagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const fontSize = options.fontSize || 42;
  const startX = options.startX || 80;
  const maxWidth = options.maxWidth || canvas.width * 0.7;
  const lineSpacing = options.lineSpacing || Math.floor(fontSize * 0.5);
  const gap = options.gap || Math.floor(fontSize * 0.5);
  ctx.font = `bold ${fontSize}px Arial`;
  function wrapText(text) {
    const words = text.split(" ");
    let lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }
  const lines = wrapText(text);
  let y = ((canvas.height * 0.5) - (canvas.height * 0.15));
  const quoteFontSize = Math.floor(fontSize * 1.4);
  const boxSize = quoteFontSize * 0.8;
  ctx.fillStyle = "#00B894";
  ctx.fillRect(startX, y - fontSize - boxSize - gap, boxSize, boxSize);
  ctx.fillStyle = "white";
  ctx.font = `bold ${quoteFontSize}px Arial`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("❝", startX + boxSize / 2, y - fontSize - boxSize / 2);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  for (const line of lines) {
    const lineWidth = ctx.measureText(line).width;
    const paddingX = Math.floor(fontSize * 0.5);
    const paddingY = Math.floor(fontSize * 0.25);
    ctx.fillStyle = "white";
    ctx.fillRect(
      startX - paddingX / 2,
      y - fontSize,
      lineWidth + paddingX,
      fontSize + paddingY
    );
    ctx.fillStyle = "black";
    ctx.fillText(line, startX, y);
    y += fontSize + lineSpacing;
  }
  return canvas.toBuffer();
}

module.exports = {
  generateQuote,
  generateMeme,
  generateFakeStory,
  generateFakeTweet,
  generateFakeChatIphone
};