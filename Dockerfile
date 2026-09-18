# Final stage for building the Node.js application  
FROM node:24.6.0 AS builder
WORKDIR /app
COPY package*.json ./
COPY src ./src

RUN npm install

# Debug: show the contents of the working directory after copying the initial files
RUN echo "Contents of /app after copying initial files:" && ls -la /app
RUN npm run build
RUN echo "Contents of /app after building:" && ls -la /app



# Runtime stage for running the Node.js application
FROM node:24.6.0-alpine AS runtime
WORKDIR /app

# Copy the built application and package files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only the production dependencies (no devDependencies, skip scripts like husky)
RUN npm install --only=production --omit-dev --ignore-scripts


CMD ["node", "dist/server.js"]