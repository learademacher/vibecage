import {
  brand,
  success,
  warn,
  muted,
  bold,
  statusRunning,
  statusStopped,
  statusNone,
  statusUnknown,
  cmdHint,
} from '../utils/theme.js';
import { table, truncate, getWidth } from '../utils/terminal.js';
import { getAllSandboxes, loadLocalConfig } from '../utils/config.js';
import { getContainerName, getContainerStatus, isDockerRunning } from '../utils/docker.js';

/**
 * Show status of all sandboxes
 */
export async function status() {
  console.log(brand('\n  vibecage status\n'));

  // Check if Docker is running
  const dockerRunning = isDockerRunning();
  if (!dockerRunning) {
    console.log(warn('  Docker is not running.\n'));
  }

  // Get all registered sandboxes
  const sandboxes = await getAllSandboxes();
  const sandboxNames = Object.keys(sandboxes);

  if (sandboxNames.length === 0) {
    console.log(muted('  No sandboxes configured.\n'));
    console.log(cmdHint('  Run ', 'vibecage init', ' to create one.\n'));
    return;
  }

  // Build table data
  const headers = ['NAME', 'STATUS', 'PORTS', 'PROJECT'];
  const rows = [];
  const maxProjectWidth = Math.min(getWidth() - 50, 40);

  for (const name of sandboxNames) {
    const info = sandboxes[name];
    const containerName = getContainerName(name);
    const containerStatus = dockerRunning ? getContainerStatus(containerName) : 'unknown';

    // Load local config for more details
    const config = await loadLocalConfig(info.projectDir);

    // Status indicator and text
    let statusIcon, statusText;
    switch (containerStatus) {
      case 'running':
        statusIcon = statusRunning;
        statusText = success('running');
        break;
      case 'stopped':
        statusIcon = statusStopped;
        statusText = warn('stopped');
        break;
      case 'not created':
        statusIcon = statusNone;
        statusText = muted('not created');
        break;
      default:
        statusIcon = statusUnknown;
        statusText = muted('unknown');
    }

    // Format ports
    const ports = config?.ports || 'all';
    const portsDisplay = ports === 'all' ? muted('all') :
                         ports === 'none' ? muted('none') :
                         ports === 'minimal' ? muted('minimal') :
                         muted(truncate(ports, 12));

    // Truncate long project paths
    const projectPath = truncate(info.projectDir, maxProjectWidth);

    rows.push([
      `${statusIcon} ${bold(name)}`,
      statusText,
      portsDisplay,
      muted(projectPath),
    ]);
  }

  console.log(table(headers, rows));
  console.log();
}
