import chalk from 'chalk';

/**
 * Semantic color theme for consistent CLI styling
 * Single source of truth for all visual styling
 */

// Brand colors
export const brand = chalk.bold.cyan;
export const brandDim = chalk.cyan;

// Status colors
export const success = chalk.green;
export const warn = chalk.yellow;
export const error = chalk.red;
export const muted = chalk.dim;

// Emphasis
export const bold = chalk.bold;
export const accent = chalk.bold.white;

// Status indicators
export const statusRunning = chalk.green('●');
export const statusStopped = chalk.yellow('●');
export const statusNone = chalk.dim('○');
export const statusUnknown = chalk.dim('?');

/**
 * Format a header line (brand styled)
 */
export function header(text) {
  return brand(text);
}

/**
 * Format an error message
 */
export function errorMsg(text) {
  return error(text);
}

/**
 * Format a success message
 */
export function successMsg(text) {
  return success(text);
}

/**
 * Format a warning message
 */
export function warnMsg(text) {
  return warn(text);
}

/**
 * Format muted/secondary text
 */
export function mutedText(text) {
  return muted(text);
}

/**
 * Format a command hint (muted text + bold command)
 */
export function cmdHint(prefix, command, suffix = '') {
  return muted(prefix) + bold(command) + muted(suffix);
}
