import inquirer from 'inquirer';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
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
import {
  saveLocalConfig,
  registerSandbox,
  loadLocalConfig,
} from '../utils/config.js';
import { isDockerRunning, imageExists, buildImage, getBaseImageName } from '../utils/docker.js';
import { generateDockerfile } from '../docker/dockerfile.js';

/**
 * Initialize a new sandbox with setup wizard
 */
export async function init(name, options) {
  const sandboxName = name || 'default';
  const projectDir = options.dir ? resolve(options.dir) : process.cwd();

  console.log(brand('\n  vibecage\n'));
  console.log(muted(`  Setting up sandbox "${sandboxName}" in ${projectDir}\n`));

  // Check if Docker is running
  if (!isDockerRunning()) {
    console.log(error('  Docker is not running. Please start Docker and try again.\n'));
    process.exit(1);
  }

  // Check if config already exists
  const existingConfig = await loadLocalConfig(projectDir);
  if (existingConfig) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Sandbox already configured in this directory. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(warn('\n  Aborted.\n'));
      return;
    }
  }

  // Gather configuration
  let config;
  if (options.ports) {
    // Skip wizard if --ports provided
    config = {
      name: sandboxName,
      projectsDir: projectDir,
      ports: options.ports,
      yolo: options.yolo || false,
    };
  } else {
    // Interactive wizard
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectsDir',
        message: 'Where should your projects folder be?',
        default: projectDir,
      },
      {
        type: 'list',
        name: 'ports',
        message: 'Which ports do you want to expose?',
        choices: [
          {
            name: 'All ports (3000-3001, 5173-5174, 8000-8080, databases...)',
            value: 'all',
          },
          {
            name: 'Minimal (3000, 8080 only)',
            value: 'minimal',
          },
          {
            name: 'None (I\'ll run servers manually)',
            value: 'none',
          },
          {
            name: 'Custom (specify your own)',
            value: 'custom',
          },
        ],
      },
      {
        type: 'confirm',
        name: 'yolo',
        message: 'Enable YOLO mode? (claude runs with --dangerously-skip-permissions)',
        default: false,
      },
    ]);

    let ports = answers.ports;
    if (ports === 'custom') {
      const customPorts = await inquirer.prompt([
        {
          type: 'input',
          name: 'ports',
          message: 'Enter ports (comma-separated, e.g., 3000,8080,5432):',
        },
      ]);
      ports = customPorts.ports;
    }

    config = {
      name: sandboxName,
      projectsDir: resolve(answers.projectsDir),
      ports,
      yolo: answers.yolo,
    };
  }

  // Create directories and files
  const dirSpinner = spinner('Creating directories...').start();
  try {
    await mkdir(config.projectsDir, { recursive: true });
    await mkdir(`${config.projectsDir}/.vibecage/claude-config`, { recursive: true });
    // Create zsh_history as a file (not directory) so Docker mounts it correctly
    await writeFile(`${config.projectsDir}/.vibecage/zsh_history`, '', { flag: 'a' });
    dirSpinner.succeed('Directories created');
  } catch (err) {
    dirSpinner.fail(`Failed to create directories: ${err.message}`);
    process.exit(1);
  }

  // Save config
  const configSpinner = spinner('Saving configuration...').start();
  try {
    await saveLocalConfig(config.projectsDir, config);
    await registerSandbox(config.name, config.projectsDir);
    configSpinner.succeed('Configuration saved');
  } catch (err) {
    configSpinner.fail(`Failed to save configuration: ${err.message}`);
    process.exit(1);
  }

  // Build base image if needed
  if (!imageExists(getBaseImageName())) {
    console.log(warn('\n  Building Docker image (this takes a few minutes first time)...\n'));

    const buildSpinner = spinner('Building vibecage base image...').start();
    try {
      const dockerfile = generateDockerfile();
      await buildImage(getBaseImageName(), dockerfile, (output) => {
        // Update spinner with progress
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

  console.log(success('\n  Sandbox initialized successfully!\n'));
  console.log(cmdHint('  Run ', 'vibecage', ' to start your sandbox.\n'));
}
