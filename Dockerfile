FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# The build uses a fallback NEXTAUTH_SECRET for compilation.
# At runtime, the application will use the secret from:
# 1. Environment variable NEXTAUTH_SECRET
# 2. data/config.json (generated during /api/setup)
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3100

# Single service running on port 3100
# Admin functions available at /admin routes based on user role
# NOTE: Run the /api/setup endpoint on first startup to configure the application
CMD ["npm", "start"]