# Step 1: Build the application
FROM node:16 as build

COPY models/ ./models

# Set the working directory in the container
WORKDIR /ui

# Copy package.json and package-lock.json to work directory
COPY ./ui/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app's source code from your host to your image filesystem.
COPY ./ui .

# Build the application
RUN npm run build

# Step 2: Serve the application from Nginx
FROM nginx:stable-alpine

# Copy the build output to replace the default nginx contents.
COPY --from=build /ui/build /usr/share/nginx/html

# Expose port 80 to the outside once the container has launched
EXPOSE 80

# Tell Docker about the port we'll run on.
CMD ["nginx", "-g", "daemon off;"]
