#!/bin/bash

# Startup script for hinter-cline container
# Initializes hinter-core-data/ as a git repository if it hasn't been initialized

export HOME=/tmp/home
mkdir -p "$HOME"

HINTER_DATA_DIR="/hinter-cline/hinter-core-data"

echo "Starting hinter-cline initialization..."

# Set up git configuration if not already set
if [ -z "$(git config --global user.name)" ]; then
    echo "Setting git user.name to 'hinter'..."
    git config --global user.name "hinter"
else
    echo "Git user.name already configured as: $(git config --global user.name)"
fi

if [ -z "$(git config --global user.email)" ]; then
    echo "Setting git user.email to 'hinter@localhost'..."
    git config --global user.email "hinter@localhost"
else
    echo "Git user.email already configured as: $(git config --global user.email)"
fi

# Set up VS Code settings for the current user if they don't exist
# telemetry.telemetryLevel:off is known to not turn off all VS Code telemetry
# Cline claims to respect the VS Code telemetry settings
VSCODE_SETTINGS_DIR="$HOME/.local/share/code-server/User"
VSCODE_SETTINGS_FILE="$VSCODE_SETTINGS_DIR/settings.json"

if [ ! -f "$VSCODE_SETTINGS_FILE" ]; then
    echo "Creating VS Code settings for current user..."
    mkdir -p "$VSCODE_SETTINGS_DIR"
    echo '{
  "workbench.colorTheme": "Default Dark+",
  "telemetry.telemetryLevel": "off"
}' > "$VSCODE_SETTINGS_FILE"
    echo "VS Code settings created with dark theme default and disabled telemetry"
else
    echo "VS Code settings already exist, preserving user preferences"
fi

# Check if hinter-core-data directory exists
if [ -d "$HINTER_DATA_DIR" ]; then
    echo "Found hinter-core-data directory at $HINTER_DATA_DIR"

    # Create .gitignore if it doesn't exist
    if [ ! -f "$HINTER_DATA_DIR/.gitignore" ]; then
        echo "Creating .gitignore file..."
        cat > "$HINTER_DATA_DIR/.gitignore" << 'EOF'
# macOS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
*.tmp
*.temp
*~

# hinter-core keypair
.env
# hinter-core hypercore storage
.storage
EOF
        echo ".gitignore file created"
    else
        echo ".gitignore file already exists"
    fi

    # Check if it's already a git repository
    if [ ! -d "$HINTER_DATA_DIR/.git" ]; then
        echo "Initializing $HINTER_DATA_DIR as a git repository..."
        cd "$HINTER_DATA_DIR"
        git init
        git add .
        git commit -m "Initial commit"
        echo "Git repository initialized successfully"
    else
        echo "Git repository already exists in $HINTER_DATA_DIR"
    fi
    
    # Create entries directory if it doesn't exist
    if [ ! -d "$HINTER_DATA_DIR/entries" ]; then
        echo "Creating entries/ directory..."
        mkdir -p "$HINTER_DATA_DIR/entries"
        echo "entries/ directory created"
    else
        echo "entries/ directory already exists"
    fi
    
    echo "hinter-core-data initialization complete"
else
    echo "Warning: hinter-core-data directory not found at $HINTER_DATA_DIR"
    echo "This may be because the volume mount is not properly configured"
fi

code-server --install-extension saoudrizwan.claude-dev

echo "Starting code-server..."
exec code-server --auth none --disable-telemetry --bind-addr 0.0.0.0:8080 /hinter-cline
