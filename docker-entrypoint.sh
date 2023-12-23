#!/bin/bash

# Display message
echo "Starting SSH agent..."

# Start the SSH agent
eval "$(ssh-agent -s)"

# Execute the CMD from the Dockerfile
exec "$@"
