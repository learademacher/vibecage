import {
  brand,
  success,
  warn,
  error,
  muted,
  bold,
} from '../utils/theme.js';
import { resolveSandboxConfig, saveLocalConfig } from '../utils/config.js';
import { getContainerName, isContainerRunning } from '../utils/docker.js';

/**
 * Show all configured ports for a sandbox
 */
export async function showPorts(name) {
  const resolved = await resolveSandboxConfig(name);

  if (!resolved) {
    if (name) {
      console.log(error(`\n  Sandbox "${name}" not found.\n`));
    } else {
      console.log(error('\n  No sandbox configured in this directory.\n'));
    }
    process.exit(1);
  }

  const { config } = resolved;
  console.log(brand('\n  vibecage ports\n'));
  console.log(muted(`  Sandbox: ${config.name}\n`));

  const ports = config.ports || 'all';

  if (ports === 'all') {
    console.log('  Port preset: ' + success('all'));
    console.log(muted('  3000, 3001, 5173, 5174, 4200, 8000, 8001, 8080, 8081,'));
    console.log(muted('  3030, 5432, 3306, 27017, 6379, 4000, 9000, 9090, 8888\n'));
  } else if (ports === 'minimal') {
    console.log('  Port preset: ' + success('minimal'));
    console.log(muted('  3000, 8080\n'));
  } else if (ports === 'none') {
    console.log('  Port preset: ' + warn('none'));
    console.log(muted('  No ports exposed\n'));
  } else {
    console.log('  Custom ports: ' + success(ports) + '\n');
  }

  const containerName = getContainerName(config.name);
  if (isContainerRunning(containerName)) {
    console.log(warn('  Note: Restart sandbox to apply port changes.\n'));
  }
}

/**
 * Add ports to a sandbox
 */
export async function addPorts(name, portsToAdd) {
  const resolved = await resolveSandboxConfig(name);

  if (!resolved) {
    if (name) {
      console.log(error(`\n  Sandbox "${name}" not found.\n`));
    } else {
      console.log(error('\n  No sandbox configured in this directory.\n'));
    }
    process.exit(1);
  }

  const { config, projectDir } = resolved;

  // Get current ports as array
  let currentPorts = [];
  if (config.ports === 'all' || !config.ports) {
    console.log(warn('\n  Sandbox already has all ports. Use custom ports instead.\n'));
    return;
  } else if (config.ports === 'minimal') {
    currentPorts = ['3000', '8080'];
  } else if (config.ports === 'none') {
    currentPorts = [];
  } else {
    currentPorts = config.ports.split(',').map(p => p.trim());
  }

  // Add new ports
  const newPorts = portsToAdd.split(',').map(p => p.trim());
  for (const port of newPorts) {
    if (!currentPorts.includes(port)) {
      currentPorts.push(port);
    }
  }

  // Save config
  config.ports = currentPorts.join(',');
  await saveLocalConfig(projectDir, config);

  console.log(success(`\n  Added ports: ${portsToAdd}`));
  console.log(muted(`  Current ports: ${config.ports}\n`));

  const containerName = getContainerName(config.name);
  if (isContainerRunning(containerName)) {
    console.log(warn('  Restart sandbox to apply changes: vibecage stop && vibecage\n'));
  }
}

/**
 * Remove ports from a sandbox
 */
export async function removePorts(name, portsToRemove) {
  const resolved = await resolveSandboxConfig(name);

  if (!resolved) {
    if (name) {
      console.log(error(`\n  Sandbox "${name}" not found.\n`));
    } else {
      console.log(error('\n  No sandbox configured in this directory.\n'));
    }
    process.exit(1);
  }

  const { config, projectDir } = resolved;

  // Get current ports as array
  let currentPorts = [];
  if (config.ports === 'all' || !config.ports) {
    // Convert 'all' to explicit list
    currentPorts = ['3000', '3001', '5173', '5174', '4200', '8000', '8001',
                    '8080', '8081', '3030', '5432', '3306', '27017', '6379',
                    '4000', '9000', '9090', '8888'];
  } else if (config.ports === 'minimal') {
    currentPorts = ['3000', '8080'];
  } else if (config.ports === 'none') {
    console.log(warn('\n  No ports to remove.\n'));
    return;
  } else {
    currentPorts = config.ports.split(',').map(p => p.trim());
  }

  // Remove specified ports
  const portsToRemoveList = portsToRemove.split(',').map(p => p.trim());
  currentPorts = currentPorts.filter(p => !portsToRemoveList.includes(p));

  // Save config
  config.ports = currentPorts.length > 0 ? currentPorts.join(',') : 'none';
  await saveLocalConfig(projectDir, config);

  console.log(success(`\n  Removed ports: ${portsToRemove}`));
  console.log(muted(`  Current ports: ${config.ports}\n`));

  const containerName = getContainerName(config.name);
  if (isContainerRunning(containerName)) {
    console.log(warn('  Restart sandbox to apply changes: vibecage stop && vibecage\n'));
  }
}

/**
 * Set ports to a preset or custom list
 */
export async function setPorts(name, ports) {
  const resolved = await resolveSandboxConfig(name);

  if (!resolved) {
    if (name) {
      console.log(error(`\n  Sandbox "${name}" not found.\n`));
    } else {
      console.log(error('\n  No sandbox configured in this directory.\n'));
    }
    process.exit(1);
  }

  const { config, projectDir } = resolved;

  config.ports = ports;
  await saveLocalConfig(projectDir, config);

  console.log(success(`\n  Ports set to: ${ports}\n`));

  const containerName = getContainerName(config.name);
  if (isContainerRunning(containerName)) {
    console.log(warn('  Restart sandbox to apply changes: vibecage stop && vibecage\n'));
  }
}
