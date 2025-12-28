import {
  brand,
  success,
  warn,
  error,
  muted,
  bold,
} from '../utils/theme.js';
import { resolveSandboxConfig, saveLocalConfig } from '../utils/config.js';

/**
 * Show YOLO mode status for a sandbox
 */
export async function showYolo(name) {
  const resolved = await resolveSandboxConfig(name);
  if (!resolved) {
    console.log(error('\n  No sandbox found. Run `vibecage init` first.\n'));
    return;
  }

  const { config } = resolved;
  const yoloEnabled = config.yolo || false;

  console.log(brand('\n  vibecage yolo\n'));
  console.log(`  Sandbox: ${bold(config.name)}`);
  console.log(`  Status:  ${yoloEnabled ? success('enabled') : muted('disabled')}`);

  if (yoloEnabled) {
    console.log(muted('\n  Claude runs with --dangerously-skip-permissions'));
  }
  console.log();
}

/**
 * Enable YOLO mode for a sandbox
 */
export async function enableYolo(name) {
  const resolved = await resolveSandboxConfig(name);
  if (!resolved) {
    console.log(error('\n  No sandbox found. Run `vibecage init` first.\n'));
    return;
  }

  const { config, projectDir } = resolved;
  config.yolo = true;
  await saveLocalConfig(projectDir, config);

  console.log(success('\n  YOLO mode enabled!'));
  console.log(muted('  Claude will run with --dangerously-skip-permissions'));
  console.log(warn('\n  Restart sandbox for changes to take effect: vibecage stop && vibecage\n'));
}

/**
 * Disable YOLO mode for a sandbox
 */
export async function disableYolo(name) {
  const resolved = await resolveSandboxConfig(name);
  if (!resolved) {
    console.log(error('\n  No sandbox found. Run `vibecage init` first.\n'));
    return;
  }

  const { config, projectDir } = resolved;
  config.yolo = false;
  await saveLocalConfig(projectDir, config);

  console.log(success('\n  YOLO mode disabled.'));
  console.log(muted('  Claude will prompt for permissions as normal.'));
  console.log(warn('\n  Restart sandbox for changes to take effect: vibecage stop && vibecage\n'));
}

/**
 * Toggle YOLO mode for a sandbox
 */
export async function toggleYolo(name) {
  const resolved = await resolveSandboxConfig(name);
  if (!resolved) {
    console.log(error('\n  No sandbox found. Run `vibecage init` first.\n'));
    return;
  }

  const { config, projectDir } = resolved;
  const newValue = !config.yolo;
  config.yolo = newValue;
  await saveLocalConfig(projectDir, config);

  if (newValue) {
    console.log(success('\n  YOLO mode enabled!'));
    console.log(muted('  Claude will run with --dangerously-skip-permissions'));
  } else {
    console.log(success('\n  YOLO mode disabled.'));
    console.log(muted('  Claude will prompt for permissions as normal.'));
  }
  console.log(warn('\n  Restart sandbox for changes to take effect: vibecage stop && vibecage\n'));
}
