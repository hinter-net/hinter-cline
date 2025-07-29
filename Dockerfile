FROM ubuntu:24.04

# Install dependencies and apply placeholder git user config
RUN apt-get update && apt-get install -y curl git \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs \
 && apt-get clean && rm -rf /var/lib/apt/lists/* \
 && git config --global user.name "hinter-core" \
 && git config --global user.email "hinter-core"

# Install code-server and Cline
RUN curl -fsSL https://code-server.dev/install.sh | sh
RUN code-server --install-extension saoudrizwan.claude-dev
# telemetry.telemetryLevel:off is known to not turn off all VS Code telemetry
RUN mkdir -p /root/.local/share/code-server/User && \
  echo '{\n  "workbench.colorTheme": "Default Dark+",\n  "telemetry.telemetryLevel": "off"\n}' > /root/.local/share/code-server/User/settings.json
# Cline settings are not stored in settings.json so we can't turn off Cline telemetry here
# Cline claims to respect the VS Code telemetry settings but the user should turn it off manually as well

# Copy over and install hinter-core
WORKDIR /app
COPY package*.json .
RUN npm i
COPY .clinerules/ ./.clinerules/
COPY .clineignore ./.clineignore
COPY src/ ./src/

# Copy startup script and make it executable
COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

CMD ["/app/startup.sh"]
