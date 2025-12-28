/**
 * Generate the Dockerfile content for vibe-box base image
 */
export function generateDockerfile() {
  return `FROM ubuntu:24.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install core dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    wget \\
    git \\
    build-essential \\
    pkg-config \\
    libssl-dev \\
    ca-certificates \\
    gnupg \\
    lsb-release \\
    sudo \\
    zsh \\
    locales \\
    file \\
    procps \\
    && rm -rf /var/lib/apt/lists/*

# Set up locale (needed for some tools)
RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8

# Install Node.js (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \\
    && apt-get install -y nodejs

# Install Python
RUN apt-get update && apt-get install -y \\
    python3 \\
    python3-pip \\
    python3-venv \\
    && rm -rf /var/lib/apt/lists/*

# Install Go (auto-detect architecture)
RUN ARCH=$(dpkg --print-architecture) && \\
    if [ "$ARCH" = "arm64" ]; then GO_ARCH="arm64"; else GO_ARCH="amd64"; fi && \\
    wget https://go.dev/dl/go1.22.0.linux-\${GO_ARCH}.tar.gz && \\
    tar -C /usr/local -xzf go1.22.0.linux-\${GO_ARCH}.tar.gz && \\
    rm go1.22.0.linux-\${GO_ARCH}.tar.gz
ENV PATH=$PATH:/usr/local/go/bin

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH=$PATH:/root/.cargo/bin

# Install Docker CLI (auto-detect architecture)
RUN ARCH=$(dpkg --print-architecture) && \\
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \\
    echo "deb [arch=\${ARCH} signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list && \\
    apt-get update && \\
    apt-get install -y docker-ce-cli docker-compose-plugin && \\
    rm -rf /var/lib/apt/lists/*

# Install Claude Code and Codex CLI
RUN npm install -g @anthropic-ai/claude-code @openai/codex

# Create non-root user with sudo access
RUN useradd -m -s /bin/zsh claude && \\
    usermod -aG docker claude 2>/dev/null || true && \\
    echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Copy Rust installation to claude user
RUN cp -r /root/.cargo /home/claude/.cargo && \\
    cp -r /root/.rustup /home/claude/.rustup && \\
    chown -R claude:claude /home/claude/.cargo /home/claude/.rustup

# Switch to claude user for remaining setup
USER claude
WORKDIR /home/claude

# Install Oh-My-Zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Install zsh plugins
RUN git clone https://github.com/zsh-users/zsh-autosuggestions \${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions && \\
    git clone https://github.com/zsh-users/zsh-syntax-highlighting \${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

# Install Homebrew
RUN /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install try (https://github.com/binpash/try) - sandboxed command execution
RUN git clone --depth 1 https://github.com/binpash/try.git /tmp/try && \\
    sudo cp /tmp/try/try /usr/local/bin/try && \\
    sudo chmod +x /usr/local/bin/try && \\
    rm -rf /tmp/try

# Configure zsh
RUN echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin:$HOME/.cargo/bin' >> ~/.zshrc && \\
    echo 'export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"' >> ~/.zshrc && \\
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.zshrc && \\
    echo '' >> ~/.zshrc && \\
    echo '# YOLO mode: run claude with --dangerously-skip-permissions' >> ~/.zshrc && \\
    echo 'if [ "$VIBECAGE_YOLO" = "true" ]; then' >> ~/.zshrc && \\
    echo '  alias claude="claude --dangerously-skip-permissions"' >> ~/.zshrc && \\
    echo 'fi' >> ~/.zshrc && \\
    sed -i 's/plugins=(git)/plugins=(git zsh-autosuggestions zsh-syntax-highlighting)/' ~/.zshrc

# Set working directory
WORKDIR /home/claude/projects

ENV PATH=$PATH:/usr/local/go/bin:/home/claude/go/bin:/home/claude/.cargo/bin:/home/linuxbrew/.linuxbrew/bin

CMD ["zsh"]
`;
}
