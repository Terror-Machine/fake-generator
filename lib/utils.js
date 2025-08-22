const EmojiDbLib = require('emoji-db');

let emojiDb;
try {
  emojiDb = new EmojiDbLib({ useDefaultDb: true });
  if (!emojiDb || typeof emojiDb.searchFromText !== 'function') throw new Error('Gagal menginisialisasi database emoji');
} catch (error) {
  console.error('Error saat inisialisasi database emoji:', error);
  throw error;
}

function parseTextToSegments(text, ctx, fontSize) {
  try {
    if (typeof text !== 'string') text = String(text);
    if (!ctx || typeof ctx.measureText !== 'function') throw new TypeError('Invalid canvas context');
    const finalSegments = [];
    const rawLines = text.split('\n');
    rawLines.forEach((line, index) => {
      if (line === '') {
      } else {
        const segmentsInLine = [];
        const emojiMatches = emojiDb.searchFromText({ input: line, fixCodePoints: true });
        let lastIndex = 0;
        const processChunk = (chunk) => {
          if (!chunk) return;
          const tokenizerRegex = /(\*_.*?_\*|_\*.*?\*_)|(\*.*?\*)|(_.*?_)|(~.*?~)|(```.*?```)|(\s+)|([^\s*~_`]+)/g;
          let match;
          while ((match = tokenizerRegex.exec(chunk)) !== null) {
            const [fullMatch, boldItalic, bold, italic, strikethrough, monospace, whitespace, textContent] = match;
            if (boldItalic) {
              const content = boldItalic.slice(2, -2);
              ctx.font = `italic bold ${fontSize}px Arial`;
              segmentsInLine.push({ type: 'bolditalic', content, width: ctx.measureText(content).width });
            } else if (bold) {
              const content = bold.slice(1, -1);
              ctx.font = `bold ${fontSize}px Arial`;
              segmentsInLine.push({ type: 'bold', content, width: ctx.measureText(content).width });
            } else if (italic) {
              const content = italic.slice(1, -1);
              ctx.font = `italic ${fontSize}px Arial`;
              segmentsInLine.push({ type: 'italic', content, width: ctx.measureText(content).width });
            } else if (strikethrough) {
              const content = strikethrough.slice(1, -1);
              ctx.font = `${fontSize}px Arial`;
              segmentsInLine.push({ type: 'strikethrough', content, width: ctx.measureText(content).width });
            } else if (monospace) {
              const content = monospace.slice(3, -3);
              ctx.font = `${fontSize}px 'Courier New', monospace`;
              segmentsInLine.push({ type: 'monospace', content, width: ctx.measureText(content).width });
            } else if (whitespace) {
              ctx.font = `${fontSize}px Arial`;
              segmentsInLine.push({ type: 'whitespace', content: whitespace, width: ctx.measureText(whitespace).width });
            } else if (textContent) {
              ctx.font = `${fontSize}px Arial`;
              segmentsInLine.push({ type: 'text', content: textContent, width: ctx.measureText(textContent).width });
            }
          }
        };
        emojiMatches.forEach(emojiInfo => {
          const plainText = line.substring(lastIndex, emojiInfo.offset);
          processChunk(plainText);
          segmentsInLine.push({
            type: 'emoji',
            content: emojiInfo.found,
            width: fontSize * 1.2,
          });
          lastIndex = emojiInfo.offset + emojiInfo.length;
        });
        if (lastIndex < line.length) {
          processChunk(line.substring(lastIndex));
        }
        finalSegments.push(...segmentsInLine);
      }
      if (index < rawLines.length - 1) {
        finalSegments.push({ type: 'newline', content: '\n', width: 0 });
      }
    });
    ctx.font = `${fontSize}px Arial`;
    return finalSegments;
  } catch (error) {
    console.error('Error in parseTextToSegments:', error);
    return [];
  }
}

function rebuildLinesFromSegments(segments, maxWidth, ctx, fontSize) {
  try {
    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;
    const getFontString = (type, size) => {
      switch (type) {
        case 'bold': return `bold ${size}px Arial`;
        case 'italic': return `italic ${size}px Arial`;
        case 'bolditalic': return `italic bold ${size}px Arial`;
        case 'monospace': return `${size}px 'Courier New', monospace`;
        default: return `${size}px Arial`;
      }
    };
    segments.forEach(segment => {
      if (segment.type === 'newline') {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
        return;
      }
      if (segment.width > maxWidth && segment.type !== 'emoji') {
        if (currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = [];
          currentLineWidth = 0;
        }
        let tempStr = '';
        const originalFont = getFontString(segment.type, fontSize);
        ctx.font = originalFont;
        for (const char of segment.content) {
          const measuredWidth = ctx.measureText(tempStr + char).width;
          if (measuredWidth > maxWidth) {
            lines.push([{ type: segment.type, content: tempStr, width: ctx.measureText(tempStr).width }]);
            tempStr = char;
          } else {
            tempStr += char;
          }
        }
        if (tempStr) {
          currentLine = [{ type: segment.type, content: tempStr, width: ctx.measureText(tempStr).width }];
          currentLineWidth = currentLine[0].width;
        }
        return;
      }
      if (currentLineWidth + segment.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [segment];
        currentLineWidth = segment.width;
      } else {
        if (segment.type === 'whitespace' && currentLine.length === 0) return;
        currentLine.push(segment);
        currentLineWidth += segment.width;
      }
    });
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    return lines;
  } catch (error) {
    console.error('Error in rebuildLinesFromSegments:', error);
    return [[]];
  }
}

function getContrastColor(hexColor) {
  if (!hexColor || typeof hexColor !== 'string') return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  return luminance > 140 ? '#000000' : '#FFFFFF';
};

module.exports = {
  parseTextToSegments,
  rebuildLinesFromSegments,
  getContrastColor
};