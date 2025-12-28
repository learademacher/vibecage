<p align="center">
  <em>proudly 100% vibe coded</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vibecage"><img src="https://img.shields.io/npm/v/vibecage?style=flat-square" alt="npm version"></a>
  <img src="https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows-brightgreen?style=flat-square" alt="platforms">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license">
</p>

<h1 align="center">vibecage</h1>

<p align="center">
  <strong>Run Claude Code in an isolated Docker sandbox.</strong><br>
  Full dev environment. Zero host pollution. One command.
</p>

<p align="center">
  <code>npm install -g vibecage && vibecage</code>
</p>

---

## Why vibecage?

Claude Code is powerful, but it runs on your machine. **vibecage** gives Claude its own containerized playground with:

- **Complete isolation** — Claude can't touch your host system
- **Pre-installed tools** — Node, Python, Go, Rust, Docker ready to go
- **State persistence** — Installed packages and auth survive restarts
- **YOLO mode** — Skip all permission prompts (you're in a sandbox anyway)

---

## Quick Start

```bash
npm install -g vibecage
cd ~/my-projects
vibecage
```

That's it. First run shows a setup wizard, then drops you into a fully-configured zsh shell.

---

## What's Inside

Your sandbox comes batteries-included:

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS | + npm |
| Python | 3.x | + pip, venv |
| Go | 1.22 | Latest stable |
| Rust | Latest | Via rustup |
| Docker CLI | Latest | Docker-in-Docker ready |
| Claude Code | Latest | Pre-authenticated |
| Codex CLI | Latest | OpenAI's CLI |
| Oh-My-Zsh | Latest | + autosuggestions, syntax highlighting |
| Homebrew | Latest | Install anything else |
| try | Latest | Safe command sandboxing |

---

## Commands

```bash
vibecage                  # Start/attach to sandbox
vibecage stop             # Save state and stop
vibecage status           # List all sandboxes
vibecage destroy <name>   # Remove sandbox completely

vibecage yolo on          # Enable --dangerously-skip-permissions
vibecage yolo off         # Back to normal

vibecage ports show       # Show exposed ports
vibecage ports set minimal # Just 3000 + 8080
```

---

## Named Sandboxes

Create separate sandboxes for different projects:

```bash
# Work sandbox
cd ~/work && vibecage init work --ports all

# Personal sandbox
cd ~/personal && vibecage init personal --ports minimal --yolo

# Access from anywhere
vibecage work
vibecage personal
```

---

## YOLO Mode

Since you're already in a sandbox, why not let Claude run free?

```bash
vibecage yolo on
vibecage stop && vibecage  # Restart to apply
```

Now `claude` runs with `--dangerously-skip-permissions`. No more approval prompts.

---

## Persistence

| What | When |
|------|------|
| Project files | Always (mounted from host) |
| Claude/Codex auth | Always (volume) |
| Shell history | Always (volume) |
| Global packages (npm -g, pip) | On `vibecage stop` |
| System changes | On `vibecage stop` |

Your projects live at `/home/claude/projects` inside the container, mapped to your host folder.

---

## Port Presets

| Preset | Ports |
|--------|-------|
| `all` | 3000-3001, 4200, 5173-5174, 8000-8001, 8080-8081, databases |
| `minimal` | 3000, 8080 |
| `none` | No ports exposed |

```bash
vibecage init myproject --ports minimal
vibecage ports add 5432,6379  # Add Postgres + Redis later
```

---

## Prerequisites

| | Requirement |
|-|-------------|
| **All** | Node.js 18+, Docker Desktop, ~10GB disk |
| **Windows** | WSL2 enabled, Windows 10 2004+ |
| **Linux** | User in docker group |

<details>
<summary>Linux docker group setup</summary>

```bash
sudo usermod -aG docker $USER
# Log out and back in
```
</details>

---

## Troubleshooting

<details>
<summary><strong>Docker not running</strong></summary>

Start Docker Desktop and try again.
</details>

<details>
<summary><strong>Port already in use</strong></summary>

vibecage auto-remaps conflicting ports. Check `vibecage status` to see actual mappings, or use `--ports minimal`.
</details>

<details>
<summary><strong>Permission denied on Docker socket</strong></summary>

Linux: Add yourself to the docker group (see prerequisites).

macOS/Windows: Ensure Docker Desktop is running.
</details>

---

## Directory Structure

```
~/my-projects/
├── .vibecage/
│   ├── config.json       # Sandbox settings
│   ├── claude-config/    # Claude auth (persisted)
│   └── zsh_history       # Shell history (persisted)
├── my-app/
└── other-project/
```

---

## License

MIT

---

<p align="center">
  <sub>Built for developers who want Claude Code without the anxiety.</sub>
</p>
