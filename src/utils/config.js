import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname, parse } from 'path';
import { homedir } from 'os';

const GLOBAL_CONFIG_DIR = join(homedir(), '.vibecage');
const SANDBOXES_FILE = join(GLOBAL_CONFIG_DIR, 'sandboxes.json');

/**
 * Get the local config path for a project directory
 */
export function getLocalConfigPath(projectDir) {
  return join(projectDir, '.vibecage', 'config.json');
}

/**
 * Get the home directory path for a sandbox (persisted across restarts)
 */
export function getHomeDir(projectDir) {
  return join(projectDir, '.vibecage', 'home');
}

/**
 * Check if a file/directory exists
 */
export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load local sandbox config from a project directory
 */
export async function loadLocalConfig(projectDir) {
  const configPath = getLocalConfigPath(projectDir);
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Find config by searching up the directory tree (like git)
 * Returns { config, projectDir } or null if not found
 */
export async function findConfigUpward(startDir) {
  let currentDir = startDir;

  while (true) {
    const config = await loadLocalConfig(currentDir);
    if (config) {
      return { config, projectDir: currentDir };
    }

    // Move to parent directory
    const parentDir = dirname(currentDir);

    // Stop if we've reached the root
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

/**
 * Save local sandbox config to a project directory
 */
export async function saveLocalConfig(projectDir, config) {
  const configPath = getLocalConfigPath(projectDir);
  const configDir = dirname(configPath);

  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Load global sandboxes registry
 */
export async function loadGlobalRegistry() {
  try {
    const content = await readFile(SANDBOXES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Save global sandboxes registry
 */
export async function saveGlobalRegistry(registry) {
  await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
  await writeFile(SANDBOXES_FILE, JSON.stringify(registry, null, 2));
}

/**
 * Register a sandbox in the global registry
 */
export async function registerSandbox(name, projectDir) {
  const registry = await loadGlobalRegistry();
  registry[name] = { projectDir, createdAt: new Date().toISOString() };
  await saveGlobalRegistry(registry);
}

/**
 * Unregister a sandbox from the global registry
 */
export async function unregisterSandbox(name) {
  const registry = await loadGlobalRegistry();
  delete registry[name];
  await saveGlobalRegistry(registry);
}

/**
 * Get sandbox info from global registry
 */
export async function getSandboxInfo(name) {
  const registry = await loadGlobalRegistry();
  return registry[name] || null;
}

/**
 * Get all registered sandboxes
 */
export async function getAllSandboxes() {
  return await loadGlobalRegistry();
}

/**
 * Resolve sandbox config - either from current dir (searching upward) or by name lookup
 */
export async function resolveSandboxConfig(name, currentDir = process.cwd()) {
  if (!name) {
    // No name provided - first search up directory tree (like git)
    const found = await findConfigUpward(currentDir);
    if (found) {
      return found;
    }

    // Not in a sandbox directory - check for "default" sandbox in global registry
    const defaultInfo = await getSandboxInfo('default');
    if (defaultInfo) {
      const config = await loadLocalConfig(defaultInfo.projectDir);
      if (config) {
        return { config, projectDir: defaultInfo.projectDir };
      }
    }

    return null;
  }

  // Name provided - look up in global registry
  const info = await getSandboxInfo(name);
  if (!info) {
    return null;
  }

  const config = await loadLocalConfig(info.projectDir);
  if (config) {
    return { config, projectDir: info.projectDir };
  }
  return null;
}
