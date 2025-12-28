import { spawn, execSync } from 'child_process';

/**
 * Get container name for a sandbox
 */
export function getContainerName(sandboxName) {
  return `vibecage-${sandboxName}`;
}

/**
 * Get image name for a sandbox
 */
export function getImageName(sandboxName) {
  return `vibecage-${sandboxName}:latest`;
}

/**
 * Get base image name
 */
export function getBaseImageName() {
  return 'vibecage-base:latest';
}

/**
 * Check if Docker is running
 */
export function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a Docker image exists
 */
export function imageExists(imageName) {
  try {
    const output = execSync(`docker images -q ${imageName}`, { encoding: 'utf-8' });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if a container exists (running or stopped)
 */
export function containerExists(containerName) {
  try {
    const output = execSync(`docker ps -a --filter "name=^${containerName}$" --format "{{.Names}}"`, { encoding: 'utf-8' });
    return output.trim() === containerName;
  } catch {
    return false;
  }
}

/**
 * Check if a container is running
 */
export function isContainerRunning(containerName) {
  try {
    const output = execSync(`docker ps --filter "name=^${containerName}$" --format "{{.Names}}"`, { encoding: 'utf-8' });
    return output.trim() === containerName;
  } catch {
    return false;
  }
}

/**
 * Get container status
 */
export function getContainerStatus(containerName) {
  if (!containerExists(containerName)) {
    return 'not created';
  }
  if (isContainerRunning(containerName)) {
    return 'running';
  }
  return 'stopped';
}

/**
 * Build Docker image from Dockerfile content
 */
export async function buildImage(imageName, dockerfileContent, onProgress) {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', ['build', '-t', imageName, '-f', '-', '.'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin.write(dockerfileContent);
    proc.stdin.end();

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
      if (onProgress) onProgress(data.toString());
    });
    proc.stderr.on('data', (data) => {
      output += data.toString();
      if (onProgress) onProgress(data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Docker build failed with code ${code}\n${output}`));
      }
    });
  });
}

/**
 * Start a container with docker-compose
 */
export async function startContainer(composeContent, projectDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn('docker', ['compose', '-f', '-', 'up', '-d'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: projectDir,
    });

    proc.stdin.write(composeContent);
    proc.stdin.end();

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Docker compose up failed with code ${code}\n${output}`));
      }
    });
  });
}

/**
 * Stop a container
 */
export function stopContainer(containerName) {
  try {
    execSync(`docker stop ${containerName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a container
 */
export function removeContainer(containerName) {
  try {
    execSync(`docker rm ${containerName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove an image
 */
export function removeImage(imageName) {
  try {
    execSync(`docker rmi ${imageName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Commit container state to image
 */
export function commitContainer(containerName, imageName) {
  try {
    execSync(`docker commit ${containerName} ${imageName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Attach to a running container
 */
export function attachToContainer(containerName) {
  const proc = spawn('docker', ['exec', '-it', containerName, 'zsh'], {
    stdio: ['inherit', 'inherit', 'ignore'], // suppress Docker's stderr "What's next" message
  });

  return new Promise((resolve) => {
    proc.on('close', (code) => {
      resolve(code);
    });
  });
}

/**
 * Start a stopped container
 */
export function startExistingContainer(containerName) {
  try {
    execSync(`docker start ${containerName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
