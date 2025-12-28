import { brand, muted } from './theme.js';

/**
 * Terminal utilities for width-aware output and box drawing
 */

// Box drawing characters (Unicode)
const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

/**
 * Get terminal width (fallback to 80)
 */
export function getWidth() {
  return process.stdout.columns || 80;
}

/**
 * Check if output is a TTY (interactive terminal)
 */
export function isTTY() {
  return process.stdout.isTTY === true;
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Pad string to exact width (right-padded)
 */
export function pad(str, width) {
  const len = stripAnsi(str).length;
  if (len >= width) return str;
  return str + ' '.repeat(width - len);
}

/**
 * Pad string to exact width (left-padded)
 */
export function padLeft(str, width) {
  const len = stripAnsi(str).length;
  if (len >= width) return str;
  return ' '.repeat(width - len) + str;
}

/**
 * Center string within width
 */
export function center(str, width) {
  const len = stripAnsi(str).length;
  if (len >= width) return str;
  const leftPad = Math.floor((width - len) / 2);
  const rightPad = width - len - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

/**
 * Strip ANSI codes from string (for length calculation)
 */
export function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Draw a box around content
 * @param {string} title - Box title
 * @param {string[]} lines - Content lines
 * @param {object} options - { width, indent }
 */
export function box(title, lines, options = {}) {
  const indent = options.indent ?? 2;
  const maxWidth = options.width ?? Math.min(getWidth() - indent * 2, 60);
  const prefix = ' '.repeat(indent);

  // Calculate content width (accounting for ANSI codes)
  let contentWidth = title ? stripAnsi(title).length + 4 : 0;
  for (const line of lines) {
    const lineLen = stripAnsi(line).length + 2; // +2 for padding
    if (lineLen > contentWidth) contentWidth = lineLen;
  }
  contentWidth = Math.min(contentWidth, maxWidth);

  const innerWidth = contentWidth;
  const output = [];

  // Top border with title
  if (title) {
    const titleStr = ` ${title} `;
    const remaining = innerWidth - stripAnsi(titleStr).length;
    const rightBorder = remaining > 0 ? BOX.horizontal.repeat(remaining) : '';
    output.push(prefix + BOX.topLeft + BOX.horizontal + brand(titleStr) + rightBorder + BOX.topRight);
  } else {
    output.push(prefix + BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight);
  }

  // Content lines
  for (const line of lines) {
    const lineLen = stripAnsi(line).length;
    const padding = innerWidth - lineLen - 1;
    output.push(prefix + BOX.vertical + ' ' + line + (padding > 0 ? ' '.repeat(padding) : '') + BOX.vertical);
  }

  // Bottom border
  output.push(prefix + BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight);

  return output.join('\n');
}

/**
 * Create a simple table with aligned columns
 * @param {string[]} headers - Column headers
 * @param {string[][]} rows - Data rows
 * @param {object} options - { indent, gap }
 */
export function table(headers, rows, options = {}) {
  const indent = options.indent ?? 2;
  const gap = options.gap ?? 2;
  const prefix = ' '.repeat(indent);

  // Calculate column widths
  const colWidths = headers.map((h, i) => {
    let max = stripAnsi(h).length;
    for (const row of rows) {
      const cellLen = stripAnsi(row[i] || '').length;
      if (cellLen > max) max = cellLen;
    }
    return max;
  });

  const output = [];

  // Header row (muted)
  const headerLine = headers
    .map((h, i) => pad(muted(h), colWidths[i]))
    .join(' '.repeat(gap));
  output.push(prefix + headerLine);

  // Data rows
  for (const row of rows) {
    const rowLine = row
      .map((cell, i) => pad(cell || '', colWidths[i]))
      .join(' '.repeat(gap));
    output.push(prefix + rowLine);
  }

  return output.join('\n');
}

/**
 * Format a key-value pair
 */
export function kvPair(key, value, keyWidth = 12) {
  return muted(pad(key + ':', keyWidth)) + ' ' + value;
}

/**
 * Minimal spinner for non-TTY or when performance matters
 * Falls back to simple dots animation
 */
export class Spinner {
  constructor(text) {
    this.text = text;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIndex = 0;
    this.interval = null;
    this.stream = process.stderr;
  }

  start() {
    if (!isTTY()) {
      // Non-TTY: just print the text
      this.stream.write(`  ${this.text}\n`);
      return this;
    }

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      this.stream.write(`\r  ${frame} ${this.text}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);

    return this;
  }

  stop(symbol, finalText) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (isTTY()) {
      this.stream.write(`\r  ${symbol} ${finalText || this.text}\n`);
    }
  }

  succeed(text) {
    this.stop('✓', text || this.text);
  }

  fail(text) {
    this.stop('✗', text || this.text);
  }

  warn(text) {
    this.stop('⚠', text || this.text);
  }
}

/**
 * Create a spinner (convenience function)
 */
export function spinner(text) {
  return new Spinner(text);
}
