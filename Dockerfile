FROM ubuntu:24.04

# Install dependencies
RUN apt-get update && apt-get install -y curl git \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install code-server and Cline
RUN curl -fsSL https://code-server.dev/install.sh | sh
RUN code-server --install-extension saoudrizwan.claude-dev

# Copy over and install hinter-cline
WORKDIR /hinter-cline
COPY package*.json .
RUN npm ci
COPY .clinerules/ ./.clinerules/
COPY .clineignore ./.clineignore
COPY src/ ./src/

# Copy startup script and make it executable
COPY startup.sh /hinter-cline/startup.sh
RUN chmod +x /hinter-cline/startup.sh

CMD ["/hinter-cline/startup.sh"]
