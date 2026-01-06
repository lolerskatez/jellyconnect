FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Single service running on port 3000
# Admin functions available at /admin routes
CMD ["npm", "start"]