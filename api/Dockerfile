# Use an official Node runtime as a parent image, compatible with Raspberry Pi's ARM architecture
FROM arm32v7/node:16-bullseye

RUN apt-get update && apt-get install -y \
    build-essential \
    python2 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /usr/src/models

COPY models/ ./

RUN npm install

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY api/package*.json ./

# If you're using TypeScript, copy tsconfig.json
COPY api/tsconfig.json ./

# Copy the rest of your application code
COPY api/ .

# Install any dependencies
RUN npm install && npm rebuild sqlite3 --build-from-source

# Compile TypeScript to JavaScript
RUN npm run build

# Your application's default port
EXPOSE 80

# Command to run the app
CMD [ "node", "dist/index.js" ]
