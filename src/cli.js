import { Command } from 'commander';
import { init } from './commands/init.js';
import { attach } from './commands/attach.js';
import { stop } from './commands/stop.js';
import { status } from './commands/status.js';
import { destroy } from './commands/destroy.js';
import { showPorts, addPorts, removePorts, setPorts } from './commands/ports.js';
import { showYolo, enableYolo, disableYolo, toggleYolo } from './commands/yolo.js';

const program = new Command();

program
  .name('vibecage')
  .description('Isolated Docker sandbox for Claude Code development')
  .version('1.0.0')
  .addHelpText('after', `
Examples:
  $ vibecage                    Start/attach to sandbox in current directory
  $ vibecage work               Start/attach to named sandbox 'work'
  $ vibecage init               Initialize sandbox with setup wizard
  $ vibecage init myproject     Initialize named sandbox 'myproject'
  $ vibecage stop               Stop and save sandbox state
  $ vibecage status             List all sandboxes
  $ vibecage destroy myproject  Remove sandbox entirely
  $ vibecage ports show         Show configured ports
  $ vibecage ports add 5000     Add port 5000 to sandbox
  $ vibecage yolo on            Enable YOLO mode (--dangerously-skip-permissions)
  $ vibecage yolo off           Disable YOLO mode

Help:
  $ vibecage help               Show this help
  $ vibecage init --help        Show help for a command
`);

// Handle 'help' and '?' as help commands
program
  .command('help', { hidden: true })
  .description('Show help')
  .action(() => {
    program.help();
  });

// Default command: vibecage [name] - attach to sandbox (or start if not running)
program
  .argument('[name]', 'sandbox name (optional, uses current dir config if not provided)')
  .action(async (name) => {
    // Handle '?' as help
    if (name === '?') {
      program.help();
      return;
    }
    await attach(name);
  });

// Init command: vibecage init [name] - setup wizard
program
  .command('init [name]')
  .description('Initialize a new sandbox with setup wizard')
  .option('--dir <path>', 'project directory (default: current directory)')
  .option('--ports <preset>', 'port preset: all, minimal, none, or custom list')
  .option('--yolo', 'enable YOLO mode (claude --dangerously-skip-permissions)')
  .addHelpText('after', `
Examples:
  $ vibecage init                        Interactive setup wizard
  $ vibecage init myproject              Initialize named sandbox 'myproject'
  $ vibecage init --ports minimal        Skip wizard, use minimal ports (3000, 8080)
  $ vibecage init --ports none           Skip wizard, no ports exposed
  $ vibecage init --ports 3000,5000      Skip wizard, custom ports
  $ vibecage init work --dir ~/work      Initialize in specific directory
  $ vibecage init --yolo                 Enable YOLO mode (skip all Claude permissions)
`)
  .action(async (name, options) => {
    await init(name, options);
  });

// Stop command: vibecage stop [name] - save state and stop
program
  .command('stop [name]')
  .description('Save sandbox state and stop container')
  .addHelpText('after', `
Examples:
  $ vibecage stop          Stop sandbox in current directory
  $ vibecage stop work     Stop named sandbox 'work'

Note: State is automatically saved (installed packages, Claude auth, etc.)
`)
  .action(async (name) => {
    await stop(name);
  });

// Status command: vibecage status - list all sandboxes
program
  .command('status')
  .description('List all sandboxes and their status')
  .addHelpText('after', `
Example:
  $ vibecage status

Output shows:
  - Sandbox name
  - Status (running/stopped)
  - Project directory
  - Configured ports
`)
  .action(async () => {
    await status();
  });

// Destroy command: vibecage destroy <name> - remove sandbox
program
  .command('destroy <name>')
  .description('Remove a sandbox entirely (container, image, config)')
  .option('-f, --force', 'skip confirmation prompt')
  .addHelpText('after', `
Examples:
  $ vibecage destroy myproject       Remove sandbox (with confirmation)
  $ vibecage destroy myproject -f    Remove sandbox (skip confirmation)

This removes:
  - Docker container
  - Docker image (saved state)
  - Local config (.vibecage folder)
  - Global registry entry
`)
  .action(async (name, options) => {
    await destroy(name, options);
  });

// Ports command: vibecage ports - manage ports
const portsCmd = program
  .command('ports')
  .description('Manage sandbox ports')
  .addHelpText('after', `
Examples:
  $ vibecage ports show              Show ports for current sandbox
  $ vibecage ports add 5000,5001     Add ports to current sandbox
  $ vibecage ports remove 8080       Remove port from current sandbox
  $ vibecage ports set minimal       Set to minimal preset (3000, 8080)
  $ vibecage ports set none          Disable all ports
  $ vibecage ports show work         Show ports for 'work' sandbox

Port presets:
  all      - Common dev ports (3000, 5173, 8080, databases, etc.)
  minimal  - Just 3000 and 8080
  none     - No ports exposed

Note: Restart sandbox after changes: vibecage stop && vibecage
`);

// vibecage ports show [name] - show configured ports
portsCmd
  .command('show [name]')
  .description('Show configured ports for a sandbox')
  .addHelpText('after', `
Examples:
  $ vibecage ports show          Show ports for current directory's sandbox
  $ vibecage ports show work     Show ports for 'work' sandbox
`)
  .action(async (name) => {
    await showPorts(name);
  });

// vibecage ports add <ports> [name] - add ports
portsCmd
  .command('add <ports> [name]')
  .description('Add ports to a sandbox (comma-separated)')
  .addHelpText('after', `
Examples:
  $ vibecage ports add 5000              Add single port
  $ vibecage ports add 5000,5001,5002    Add multiple ports
  $ vibecage ports add 9000 work         Add port to 'work' sandbox
`)
  .action(async (ports, name) => {
    await addPorts(name, ports);
  });

// vibecage ports remove <ports> [name] - remove ports
portsCmd
  .command('remove <ports> [name]')
  .description('Remove ports from a sandbox (comma-separated)')
  .addHelpText('after', `
Examples:
  $ vibecage ports remove 5432           Remove PostgreSQL port
  $ vibecage ports remove 3306,27017     Remove MySQL and MongoDB ports
  $ vibecage ports remove 8080 work      Remove port from 'work' sandbox
`)
  .action(async (ports, name) => {
    await removePorts(name, ports);
  });

// vibecage ports set <preset> [name] - set ports to preset
portsCmd
  .command('set <preset> [name]')
  .description('Set ports to a preset (all, minimal, none) or custom list')
  .addHelpText('after', `
Examples:
  $ vibecage ports set all               Use all common dev ports
  $ vibecage ports set minimal           Use only 3000 and 8080
  $ vibecage ports set none              Disable all ports
  $ vibecage ports set 3000,4000,5000    Set custom port list
  $ vibecage ports set minimal work      Set preset for 'work' sandbox
`)
  .action(async (preset, name) => {
    await setPorts(name, preset);
  });

// Yolo command: vibecage yolo - manage YOLO mode
const yoloCmd = program
  .command('yolo')
  .description('Manage YOLO mode (claude --dangerously-skip-permissions)')
  .addHelpText('after', `
Examples:
  $ vibecage yolo                  Show YOLO mode status
  $ vibecage yolo on               Enable YOLO mode
  $ vibecage yolo off              Disable YOLO mode
  $ vibecage yolo toggle           Toggle YOLO mode
  $ vibecage yolo on work          Enable for 'work' sandbox

YOLO mode:
  When enabled, 'claude' inside the sandbox runs with --dangerously-skip-permissions.
  This skips all permission prompts. Use with caution!

Note: Restart sandbox after changes: vibecage stop && vibecage
`);

// vibecage yolo (no subcommand) - show status
yoloCmd
  .argument('[name]', 'sandbox name')
  .action(async (name) => {
    // If name is a subcommand, let commander handle it
    if (['on', 'off', 'toggle'].includes(name)) {
      return;
    }
    await showYolo(name);
  });

// vibecage yolo on [name] - enable
yoloCmd
  .command('on [name]')
  .description('Enable YOLO mode')
  .action(async (name) => {
    await enableYolo(name);
  });

// vibecage yolo off [name] - disable
yoloCmd
  .command('off [name]')
  .description('Disable YOLO mode')
  .action(async (name) => {
    await disableYolo(name);
  });

// vibecage yolo toggle [name] - toggle
yoloCmd
  .command('toggle [name]')
  .description('Toggle YOLO mode')
  .action(async (name) => {
    await toggleYolo(name);
  });

export function run() {
  // Handle '?' as first argument
  if (process.argv[2] === '?') {
    program.help();
    return;
  }
  program.parse();
}
