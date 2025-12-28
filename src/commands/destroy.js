import inquirer from 'inquirer';
import { rm } from 'fs/promises';
import {
  brand,
  success,
  warn,
  error,
  muted,
} from '../utils/theme.js';
import { spinner } from '../utils/terminal.js';
import { getSandboxInfo, unregisterSandbox, getLocalConfigPath, getHomeDir } from '../utils/config.js';
import {
  getContainerName,
  getImageName,
  containerExists,
  isContainerRunning,
  stopContainer,
  removeContainer,
  removeImage,
} from '../utils/docker.js';

/**
 * Destroy a sandbox (container, image, config)
 */
export async function destroy(name, options) {
  console.log(brand('\n  vibecage\n'));

  // Get sandbox info
  const info = await getSandboxInfo(name);
  if (!info) {
    console.log(error(`  Sandbox "${name}" not found.\n`));
    process.exit(1);
  }

  // Confirm destruction
  if (!options.force) {
    console.log(warn(`  This will permanently delete sandbox "${name}":\n`));
    console.log(muted(`    - Docker container and image`));
    console.log(muted(`    - Sandbox configuration`));
    console.log(muted(`    - Persisted home directory (Claude auth, etc.)\n`));
    console.log(muted(`  Your project files in ${info.projectDir} will NOT be deleted.\n`));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure?',
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(warn('\n  Aborted.\n'));
      return;
    }
  }

  const containerName = getContainerName(name);
  const imageName = getImageName(name);

  // Stop container if running
  if (containerExists(containerName)) {
    if (isContainerRunning(containerName)) {
      const stopSpinner = spinner('Stopping container...').start();
      stopContainer(containerName);
      stopSpinner.succeed('Container stopped');
    }

    // Remove container
    const removeContainerSpinner = spinner('Removing container...').start();
    removeContainer(containerName);
    removeContainerSpinner.succeed('Container removed');
  }

  // Remove image
  const removeImageSpinner = spinner('Removing image...').start();
  const removed = removeImage(imageName);
  if (removed) {
    removeImageSpinner.succeed('Image removed');
  } else {
    removeImageSpinner.warn('No sandbox-specific image found (base image preserved)');
  }

  // Remove local config and home directory
  const configSpinner = spinner('Removing configuration...').start();
  try {
    const configPath = getLocalConfigPath(info.projectDir);
    const homeDir = getHomeDir(info.projectDir);
    const vibecageDir = `${info.projectDir}/.vibecage`;

    // Remove the entire .vibecage directory
    await rm(vibecageDir, { recursive: true, force: true });
    await unregisterSandbox(name);
    configSpinner.succeed('Configuration removed');
  } catch (err) {
    configSpinner.warn(`Could not remove config: ${err.message}`);
  }

  console.log(success(`\n  Sandbox "${name}" destroyed.\n`));
}
