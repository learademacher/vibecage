import { stat, rm, writeFile } from 'fs/promises';
import {
  brand,
  success,
  warn,
  error,
  muted,
  bold,
  cmdHint,
} from '../utils/theme.js';
import { spinner, truncate } from '../utils/terminal.js';
import { resolveSandboxConfig } from '../utils/config.js';
import {
  isDockerRunning,
  getContainerName,
  isContainerRunning,
  containerExists,
  attachToContainer,
  startExistingContainer,
  startContainer,
  imageExists,
  getBaseImageName,
  buildImage,
} from '../utils/docker.js';
import { generateComposeFile } from '../docker/compose.js';
import { generateDockerfile } from '../docker/dockerfile.js';
import { init } from './init.js';

/**
 * Attach to a sandbox (start if not running, init if not configured)
 */
export async function attach(name) {
  // Check if Docker is running
  if (!isDockerRunning()) {
    console.log(error('\n  Docker is not running. Please start Docker and try again.\n'));
    process.exit(1);
  }

  // Resolve sandbox config
  const resolved = await resolveSandboxConfig(name);

  if (!resolved) {
    if (name) {
      // Named sandbox not found
      console.log(error(`\n  Sandbox "${name}" not found.\n`));
      console.log(cmdHint('  Run ', `vibecage init ${name}`, ' to create it.\n'));
      process.exit(1);
    } else {
      // No config in current directory - run init wizard
      console.log(warn('\n  No sandbox configured in this directory.\n'));
      await init(undefined, {});
      // After init, try to attach again
      const newResolved = await resolveSandboxConfig(undefined);
      if (newResolved) {
        await startAndAttach(newResolved.config, newResolved.projectDir);
      }
      return;
    }
  }

  await startAndAttach(resolved.config, resolved.projectDir);
}

/**
 * Fix zsh_history if it's a directory (legacy issue)
 */
async function fixZshHistory(projectDir) {
  const historyPath = `${projectDir}/.vibecage/zsh_history`;
  try {
    const stats = await stat(historyPath);
    if (stats.isDirectory()) {
      await rm(historyPath, { recursive: true });
      await writeFile(historyPath, '', { flag: 'a' });
    }
  } catch {
    // File doesn't exist, create it
    await writeFile(historyPath, '', { flag: 'a' });
  }
}

/**
 * Start container if needed and attach
 */
async function startAndAttach(config, projectDir) {
  const containerName = getContainerName(config.name);

  // Fix zsh_history if it's a directory (legacy issue from Docker creating it wrong)
  await fixZshHistory(projectDir);

  console.log(brand('\n  vibecage\n'));
  console.log(muted(`  Sandbox: ${config.name}`));
  console.log(muted(`  Projects: ${projectDir}\n`));

  // Check container status
  if (isContainerRunning(containerName)) {
    console.log(success('  Container running. Attaching...\n'));
    await attachToContainer(containerName);
    showExitMessage(config.name);
    return;
  }

  if (containerExists(containerName)) {
    // Container exists but stopped - start it
    const spin = spinner('Starting container...').start();
    const started = startExistingContainer(containerName);
    if (started) {
      spin.succeed('Container started');
      console.log();
      await attachToContainer(containerName);
      showExitMessage(config.name);
    } else {
      spin.fail('Failed to start container');
      process.exit(1);
    }
    return;
  }

  // Container doesn't exist - need to create it
  // First, ensure base image exists
  if (!imageExists(getBaseImageName())) {
    console.log(warn('  Building Docker image (this takes a few minutes first time)...\n'));

    const buildSpinner = spinner('Building vibecage base image...').start();
    try {
      const dockerfile = generateDockerfile();
      await buildImage(getBaseImageName(), dockerfile, (output) => {
        const lines = output.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
          buildSpinner.text = truncate(lastLine, 60);
        }
      });
      buildSpinner.succeed('Docker image built successfully');
    } catch (err) {
      buildSpinner.fail('Failed to build Docker image');
      console.log(error(`\n  ${err.message}\n`));
      process.exit(1);
    }
  }

  // Start container with docker-compose
  const startSpinner = spinner('Starting container...').start();
  try {
    const { composeContent, remappedPorts } = await generateComposeFile(config, projectDir);
    await startContainer(composeContent, projectDir);
    startSpinner.succeed('Container started');

    // Show remapped ports if any
    if (remappedPorts.length > 0) {
      console.log(warn('\n  Some ports were in use, remapped:'));
      for (const { original, mapped, container } of remappedPorts) {
        console.log(muted(`    ${original} → ${mapped} (container: ${container})`));
      }
    }

    console.log();
    await attachToContainer(containerName);
    showExitMessage(config.name);
  } catch (err) {
    startSpinner.fail('Failed to start container');
    console.log(error(`\n  ${err.message}\n`));
    process.exit(1);
  }
}

/**
 * Show message after exiting container
 */
function showExitMessage(sandboxName) {
  console.log();
  console.log(success('  Container still running.'));
  console.log(muted('  State will be saved when you stop it.\n'));
  console.log(cmdHint('  To stop: ', `vibecage stop ${sandboxName}`));
  console.log();
}
