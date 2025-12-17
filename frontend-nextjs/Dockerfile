FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies without running postinstall scripts
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi

# Copy application files
COPY . .

# Run postinstall script after files are copied
RUN npm run build:icons

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
