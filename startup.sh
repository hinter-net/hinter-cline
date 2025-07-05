#!/bin/bash

# Startup script for hinter-cline container
# Initializes hinter-core-data/ as a git repository if it hasn't been initialized

HINTER_DATA_DIR="/app/hinter-core-data"

echo "Starting hinter-cline initialization..."

# Check if hinter-core-data directory exists
if [ -d "$HINTER_DATA_DIR" ]; then
    echo "Found hinter-core-data directory at $HINTER_DATA_DIR"
    
    # Check if it's already a git repository
    if [ ! -d "$HINTER_DATA_DIR/.git" ]; then
        echo "Initializing $HINTER_DATA_DIR as a git repository..."
        cd "$HINTER_DATA_DIR"
        git init
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
EOF
        echo ".gitignore file created"
    else
        echo ".gitignore file already exists"
    fi
    
    echo "hinter-core-data initialization complete"
else
    echo "Warning: hinter-core-data directory not found at $HINTER_DATA_DIR"
    echo "This may be because the volume mount is not properly configured"
fi

echo "Starting code-server..."
exec code-server --auth none --disable-telemetry --bind-addr 0.0.0.0:8080 /app