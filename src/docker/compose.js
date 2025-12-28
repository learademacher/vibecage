import { createServer } from 'net';
import { platform } from 'os';
import { getContainerName, getImageName, getBaseImageName, imageExists } from '../utils/docker.js';

/**
 * Check if a port is available on the host (cross-platform)
 * Uses Node's net module instead of OS-specific commands like lsof
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find the next available port starting from a given port
 */
async function findAvailablePort(startPort, usedHostPorts, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (!usedHostPorts.has(port) && await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Get available ports, remapping any that are in use (async, cross-platform)
 */
async function getAvailablePorts(requestedPorts) {
  const availablePorts = [];
  const usedHostPorts = new Set();

  for (const portMapping of requestedPorts) {
    const [hostPort, containerPort] = portMapping.split(':').map(Number);

    if (!usedHostPorts.has(hostPort) && await isPortAvailable(hostPort)) {
      availablePorts.push(`${hostPort}:${containerPort}`);
      usedHostPorts.add(hostPort);
    } else {
      // Find next available port
      const newHostPort = await findAvailablePort(hostPort + 1, usedHostPorts);
      if (newHostPort) {
        availablePorts.push(`${newHostPort}:${containerPort}`);
        usedHostPorts.add(newHostPort);
      }
    }
  }

  return availablePorts;
}

/**
 * Get the Docker socket path for the current platform
 */
function getDockerSocketPath() {
  const os = platform();
  if (os === 'win32') {
    // Windows with Docker Desktop uses named pipe
    // Note: In WSL2, the Linux path is used instead
    return '//./pipe/docker_engine';
  }
  // macOS and Linux use Unix socket
  return '/var/run/docker.sock';
}

/**
 * Get Docker socket volume mount for compose file
 */
function getDockerSocketMount() {
  const os = platform();
  if (os === 'win32') {
    // On Windows, Docker Desktop handles this differently
    // WSL2 backend uses Linux path inside the container
    return '//./pipe/docker_engine:/var/run/docker.sock';
  }
  return '/var/run/docker.sock:/var/run/docker.sock';
}

// Port presets
const PORT_PRESETS = {
  all: [
    // Frontend
    '3000:3000',   // React/Next.js
    '3001:3001',   // Secondary React
    '5173:5173',   // Vite
    '5174:5174',   // Secondary Vite
    '4200:4200',   // Angular
    // Backend APIs
    '8000:8000',   // Python/FastAPI
    '8001:8001',   // Secondary Python
    '8080:8080',   // Go/Java/General
    '8081:8081',   // Secondary backend
    '3030:3030',   // Additional API
    // Databases & Services
    '5432:5432',   // PostgreSQL
    '3306:3306',   // MySQL
    '27017:27017', // MongoDB
    '6379:6379',   // Redis
    // General purpose
    '4000:4000',
    '9000:9000',
    '9090:9090',   // Prometheus/metrics
    '8888:8888',   // Jupyter notebooks
  ],
  minimal: [
    '3000:3000',   // React/Next.js
    '8080:8080',   // Backend API
  ],
  none: [],  // No ports - for users running servers manually
};

/**
 * Get ports array from config
 */
export function getPorts(portsConfig) {
  if (portsConfig === 'all' || !portsConfig) {
    return PORT_PRESETS.all;
  }
  if (portsConfig === 'minimal') {
    return PORT_PRESETS.minimal;
  }
  if (portsConfig === 'none') {
    return PORT_PRESETS.none;
  }
  // Custom ports - expect comma-separated string
  if (typeof portsConfig === 'string') {
    return portsConfig.split(',').map(p => {
      const port = p.trim();
      return port.includes(':') ? port : `${port}:${port}`;
    });
  }
  // Array of ports
  if (Array.isArray(portsConfig)) {
    return portsConfig;
  }
  return PORT_PRESETS.all;
}

/**
 * Generate docker-compose.yml content for a sandbox
 * Returns { composeContent, portMappings } where portMappings shows actual host:container mappings
 */
export async function generateComposeFile(config, projectDir) {
  const containerName = getContainerName(config.name);
  const requestedPorts = getPorts(config.ports);
  const vibecageDir = `${projectDir}/.vibecage`;

  // Get available ports (auto-remap if needed)
  const ports = await getAvailablePorts(requestedPorts);

  // Use sandbox-specific image if it exists, otherwise use base image
  const imageName = imageExists(getImageName(config.name))
    ? getImageName(config.name)
    : getBaseImageName();

  // Check for remapped ports
  const remappedPorts = [];
  for (let i = 0; i < requestedPorts.length && i < ports.length; i++) {
    if (requestedPorts[i] !== ports[i]) {
      const [origHost] = requestedPorts[i].split(':');
      const [newHost, container] = ports[i].split(':');
      remappedPorts.push({ original: origHost, mapped: newHost, container });
    }
  }

  // Only include ports section if there are ports to expose
  const portsSection = ports.length > 0
    ? `    ports:\n${ports.map(p => `      - "${p}"`).join('\n')}\n`
    : '';

  // Environment variables
  const yoloEnabled = config.yolo ? 'true' : 'false';

  // Get platform-specific Docker socket mount
  const dockerSocketMount = getDockerSocketMount();

  // Docker group_add only needed on Linux (macOS and Windows handle differently)
  const os = platform();
  const groupAddSection = os === 'linux'
    ? `    # Allow container to use host Docker (Linux only)
    group_add:
      - "999"  # Docker group GID (may need adjustment)
`
    : '';

  const composeContent = `services:
  vibecage:
    image: ${imageName}
    container_name: ${containerName}
    hostname: vibecage
    environment:
      - VIBECAGE_YOLO=${yoloEnabled}
    volumes:
      # Projects folder - bind mount so you can access from host
      - ${projectDir}:/home/claude/projects
      # Persist Claude/Codex auth
      - ${vibecageDir}/claude-config:/home/claude/.claude
      # Persist shell history
      - ${vibecageDir}/zsh_history:/home/claude/.zsh_history
      # Docker-in-Docker: mount host Docker socket
      - ${dockerSocketMount}
${portsSection}    stdin_open: true
    tty: true
    working_dir: /home/claude/projects
${groupAddSection}`;

  return { composeContent, remappedPorts, ports };
}
