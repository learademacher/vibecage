import {
  brand,
  success,
  warn,
  error,
  muted,
} from '../utils/theme.js';
import { spinner } from '../utils/terminal.js';
import { resolveSandboxConfig } from '../utils/config.js';
import {
  getContainerName,
  getImageName,
  isContainerRunning,
  containerExists,
  commitContainer,
  stopContainer,
} from '../utils/docker.js';

/**
 * Stop a sandbox and save its state
 */
export async function stop(name) {
  // Resolve sandbox config
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
  const containerName = getContainerName(config.name);
  const imageName = getImageName(config.name);

  console.log(brand('\n  vibecage\n'));

  // Check if container exists
  if (!containerExists(containerName)) {
    console.log(warn(`  Sandbox "${config.name}" is not running.\n`));
    return;
  }

  // Check if container is running
  if (!isContainerRunning(containerName)) {
    console.log(warn(`  Sandbox "${config.name}" is already stopped.\n`));
    return;
  }

  // Commit container state
  const commitSpinner = spinner('Saving container state...').start();
  const committed = commitContainer(containerName, imageName);
  if (committed) {
    commitSpinner.succeed('State saved');
  } else {
    commitSpinner.fail('Failed to save state');
    console.log(error('\n  Container is still running.\n'));
    process.exit(1);
  }

  // Stop container
  const stopSpinner = spinner('Stopping container...').start();
  const stopped = stopContainer(containerName);
  if (stopped) {
    stopSpinner.succeed('Container stopped');
  } else {
    stopSpinner.fail('Failed to stop container');
    process.exit(1);
  }

  console.log(success(`\n  Sandbox "${config.name}" stopped successfully.\n`));
  console.log(muted('  Your installed packages and login state have been preserved.\n'));
}
