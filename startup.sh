#!/bin/bash

# Startup script for hinter-cline container
# Initializes hinter-core-data/ as a git repository if it hasn't been initialized

HINTER_DATA_DIR="/hinter-cline/hinter-core-data"

echo "Starting hinter-cline initialization..."

# Set up VS Code settings for the current user if they don't exist
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

echo "Starting code-server..."
exec code-server --auth none --disable-telemetry --bind-addr 0.0.0.0:8080 /hinter-cline
