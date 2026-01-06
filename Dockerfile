FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3100

# Single service running on port 3100
# Admin functions available at /admin routes based on user role
CMD ["npm", "start"]