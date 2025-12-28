# Vibecage Architecture

A technical deep-dive into how vibecage works.

## Overview

**vibecage** is a Node.js CLI tool that creates isolated Docker sandboxes for Claude Code development. It wraps Docker and Docker Compose to provide a seamless experience for running Claude Code in containerized environments with full state persistence.

## Prerequisites

### All Platforms

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Runtime for CLI |
| npm | 8+ | Comes with Node.js |
| Docker | 20+ | Container runtime |
| Disk space | ~10GB | Base image + container storage |

### Platform-Specific

**macOS:**
- Docker Desktop for Mac
- No additional setup needed

**Linux:**
- Docker Engine or Docker Desktop
- User must be in `docker` group:
  ```bash
  sudo usermod -aG docker $USER
  # Log out and back in for changes to take effect
  ```

**Windows:**
- Docker Desktop for Windows
- WSL2 backend enabled (Docker Desktop prompts for this)
- Windows 10 version 2004+ or Windows 11

### Core Value Proposition

- Run Claude Code in complete isolation from your host system
- Persist authentication, installed packages, and shell history across sessions
- Manage multiple named sandboxes for different projects
- Pre-configured development environment with Node.js, Python, Go, Rust, and more

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOST SYSTEM                              │
│                                                                  │
│  ┌──────────────────┐    ┌────────────────────────────────────┐ │
│  │   vibecage CLI   │    │        ~/.vibecage/                │ │
│  │                  │    │  └── sandboxes.json (registry)     │ │
│  │  ┌────────────┐  │    └────────────────────────────────────┘ │
│  │  │ Commander  │  │                                           │
│  │  └─────┬──────┘  │    ┌────────────────────────────────────┐ │
│  │        │         │    │     ~/my-projects/.vibecage/       │ │
│  │  ┌─────▼──────┐  │    │  ├── config.json                   │ │
│  │  │  Commands  │  │    │  ├── home/  (persisted)            │ │
│  │  └─────┬──────┘  │    │  ├── claude-config/                │ │
│  │        │         │    │  └── zsh_history                   │ │
│  │  ┌─────▼──────┐  │    └────────────────────────────────────┘ │
│  │  │   Utils    │  │                                           │
│  │  │ ├─config   │  │                                           │
│  │  │ └─docker   │──┼──────────┐                                │
│  │  └────────────┘  │          │                                │
│  └──────────────────┘          │                                │
│                                │                                │
│  ┌─────────────────────────────▼────────────────────────────┐   │
│  │                    DOCKER ENGINE                          │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │          vibecage-{name} Container                  │ │   │
│  │  │                                                     │ │   │
│  │  │  ┌───────────────────────────────────────────────┐ │ │   │
│  │  │  │           Ubuntu 24.04 Base                   │ │ │   │
│  │  │  │                                               │ │ │   │
│  │  │  │  User: claude (non-root, sudo access)         │ │ │   │
│  │  │  │                                               │ │ │   │
│  │  │  │  Pre-installed:                               │ │ │   │
│  │  │  │  • Node.js 20 LTS                             │ │ │   │
│  │  │  │  • Python 3 + pip + venv                      │ │ │   │
│  │  │  │  • Go 1.22                                    │ │ │   │
│  │  │  │  • Rust (rustup)                              │ │ │   │
│  │  │  │  • Docker CLI                                 │ │ │   │
│  │  │  │  • Claude Code CLI                            │ │ │   │
│  │  │  │  • Oh-My-Zsh + plugins                        │ │ │   │
│  │  │  │  • Homebrew                                   │ │ │   │
│  │  │  └───────────────────────────────────────────────┘ │ │   │
│  │  │                                                     │ │   │
│  │  │  Volume Mounts:                                     │ │   │
│  │  │  • /home/claude/projects ← ~/my-projects (bind)     │ │   │
│  │  │  • /home/claude/.claude  ← .vibecage/claude-config  │ │   │
│  │  │  • /home/claude/.zsh_history ← .vibecage/zsh_history│ │   │
│  │  │  • /var/run/docker.sock  ← Docker socket (DinD)     │ │   │
│  │  │                                                     │ │   │
│  │  │  Exposed Ports: 3000, 5173, 8000, 8080, etc.       │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
vibecage/
├── bin/
│   └── vibecage.js              # Entry point (shebang script)
├── src/
│   ├── cli.js                   # Commander.js CLI setup
│   ├── commands/
│   │   ├── init.js              # Setup wizard
│   │   ├── attach.js            # Start/attach to sandbox
│   │   ├── stop.js              # Stop and persist state
│   │   ├── status.js            # List all sandboxes
│   │   ├── destroy.js           # Remove sandbox
│   │   └── ports.js             # Port configuration
│   ├── docker/
│   │   ├── dockerfile.js        # Dockerfile generator
│   │   └── compose.js           # docker-compose.yml generator
│   └── utils/
│       ├── config.js            # Configuration management
│       └── docker.js            # Docker operations
├── package.json
├── README.md
└── dev-readme.md
```

## Key Components

### 1. CLI Layer (`src/cli.js`)

Built with Commander.js, routes commands to handlers:

| Command | Handler | Description |
|---------|---------|-------------|
| `vibecage` | `attach.js` | Start or attach to sandbox |
| `vibecage init` | `init.js` | Interactive setup wizard |
| `vibecage stop` | `stop.js` | Save state and stop |
| `vibecage status` | `status.js` | List all sandboxes |
| `vibecage destroy` | `destroy.js` | Remove sandbox completely |
| `vibecage ports` | `ports.js` | Manage port configuration |
| `vibecage yolo` | `yolo.js` | Manage YOLO mode |

### 2. Configuration System (`src/utils/config.js`)

Two-tier configuration:

**Local Config** (`.vibecage/config.json`):
```json
{
  "name": "myproject",
  "projectDir": "/Users/me/projects",
  "ports": "minimal",
  "yolo": false
}
```

**Global Registry** (`~/.vibecage/sandboxes.json`):
```json
{
  "myproject": {
    "projectDir": "/Users/me/projects",
    "createdAt": "2025-01-15T..."
  }
}
```

**Resolution Strategy** (git-like):
1. Search up directory tree for `.vibecage/config.json`
2. If name provided, look up in global registry
3. Allows `vibecage` command to work from any subdirectory

### 3. Docker Integration (`src/utils/docker.js`)

Wraps Docker CLI via `child_process`:

```javascript
// Key operations
buildImage(name, dockerfile)     // docker build via stdin
startContainer(name, compose)    // docker-compose up via stdin
commitContainer(name)            // docker commit (save state)
attachToContainer(name)          // spawn interactive zsh
stopContainer(name)              // docker stop
removeContainer(name)            // docker rm
removeImage(name)                // docker rmi
```

**Naming Convention**: All Docker resources use `vibecage-{sandboxName}` prefix.

### 4. Docker Generation (`src/docker/`)

**Dockerfile** (`dockerfile.js`):
- Base: Ubuntu 24.04
- Architecture-aware: Auto-detects ARM64 vs AMD64 for Go
- Creates non-root `claude` user with sudo access
- Installs full dev stack (Node, Python, Go, Rust, Docker CLI)
- Pre-installs Claude Code and Codex CLI globally
- Pre-installs `try` - sandboxed command execution for safe testing
- Pre-configures Oh-My-Zsh with plugins

**docker-compose.yml** (`compose.js`):
- Generates compose file with port mappings
- Sets up volume mounts for persistence
- Passes `VIBECAGE_YOLO` environment variable for YOLO mode
- Configures interactive TTY for shell access

## State Persistence Model

### What Persists via Volumes (Always)

| Data | Volume Mount |
|------|--------------|
| Project files | `~/projects` → `/home/claude/projects` |
| Claude auth | `.vibecage/claude-config` → `/home/claude/.claude` |
| Shell history | `.vibecage/zsh_history` → `/home/claude/.zsh_history` |

### What Persists via Commit (On Stop)

When `vibecage stop` runs:
```bash
docker commit vibecage-{name} vibecage-{name}:latest
```

This saves:
- Globally installed packages (npm -g, pip, go install)
- System modifications
- Additional tools installed via Homebrew

### Lifecycle

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   init     │────▶│   attach   │────▶│   stop     │
│            │     │            │     │            │
│ • Create   │     │ • Start or │     │ • Commit   │
│   config   │     │   attach   │     │   state    │
│ • Build    │     │ • Spawn    │     │ • Stop     │
│   image    │     │   shell    │     │   container│
└────────────┘     └────────────┘     └────────────┘
       │                 ▲                   │
       │                 │                   │
       │                 └───────────────────┘
       │                    (restart later)
       │
       │           ┌────────────┐
       └──────────▶│  destroy   │
                   │            │
                   │ • Stop     │
                   │ • Remove   │
                   │   container│
                   │ • Remove   │
                   │   image    │
                   │ • Delete   │
                   │   config   │
                   └────────────┘
```

## Port Management

### Presets

| Preset | Ports |
|--------|-------|
| `all` | 3000-3001, 5173-5174, 4200, 8000-8001, 8080-8081, 3030, 5432, 3306, 27017, 6379, 8888, 9090 |
| `minimal` | 3000, 8080 |
| `none` | (no ports exposed) |
| `custom` | User-specified |

### Auto-Remapping

If a host port is in use, vibecage automatically finds an available port:
```
Requested: 3000 → In use → Remapped to 3002
```

## YOLO Mode

YOLO mode enables running Claude with `--dangerously-skip-permissions`, which skips all permission prompts inside the sandbox.

### How It Works

1. **Config**: `yolo: true/false` stored in `.vibecage/config.json`
2. **Environment**: `VIBECAGE_YOLO=true` passed to container via docker-compose
3. **Alias**: `.zshrc` checks env var and creates alias:
   ```bash
   if [ "$VIBECAGE_YOLO" = "true" ]; then
     alias claude="claude --dangerously-skip-permissions"
   fi
   ```

### Commands

```bash
vibecage yolo           # Show current status
vibecage yolo on        # Enable YOLO mode
vibecage yolo off       # Disable YOLO mode
vibecage yolo toggle    # Toggle YOLO mode
```

Changes require sandbox restart to take effect.

## Multi-Platform Support

vibecage runs on macOS, Linux, and Windows.

### Platform-Specific Handling

| Feature | macOS/Linux | Windows |
|---------|-------------|---------|
| Docker socket | `/var/run/docker.sock` | `//./pipe/docker_engine` |
| Port checking | Node `net` module | Node `net` module |

### Cross-Platform Design

- **Port availability**: Uses Node.js `net.createServer()` instead of OS-specific commands like `lsof`
- **Docker socket**: `getDockerSocketMount()` in `compose.js` detects platform and returns correct path
- **Path handling**: Uses Node.js `path` module for cross-platform paths

```javascript
// compose.js - Cross-platform Docker socket
function getDockerSocketMount() {
  if (platform() === 'win32') {
    return '//./pipe/docker_engine:/var/run/docker.sock';
  }
  return '/var/run/docker.sock:/var/run/docker.sock';
}
```

## Technologies Used

| Component | Technology |
|-----------|------------|
| CLI Framework | Commander.js v12 |
| Terminal UI | Chalk, Inquirer, Ora |
| Container Runtime | Docker, Docker Compose |
| Base Image | Ubuntu 24.04 |
| Module System | ES Modules |
| Platforms | macOS, Linux, Windows |

## Design Decisions

### Why Docker Commit for Persistence?

Volume mounts only persist specific directories. Docker commit captures the entire filesystem state, including:
- Globally installed tools
- System package installations
- Modified system configurations

This enables a "save game" model where stopping saves everything.

### Why Generate Dockerfile/Compose Dynamically?

Rather than static files, generation allows:
- Architecture detection (ARM64/AMD64)
- Dynamic port configuration
- Custom user preferences

### Why Non-Root User?

The `claude` user:
- Mirrors typical dev environment
- Reduces security risk
- Has sudo for when elevation is needed
- Owns `/home/claude` for proper permissions

## Extension Points

### Adding More Development Tools

Edit `src/docker/dockerfile.js` to add new tools to the base image.

### Custom Port Presets

Edit `PORT_PRESETS` in `src/docker/compose.js` to add new presets.

### Additional Volume Mounts

Modify `generateComposeFile()` in `src/docker/compose.js` to add mounts.
