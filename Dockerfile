FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3010 3020

# Set app mode via environment variable (admin or public)
# For admin portal: docker run -e NEXT_PUBLIC_APP_MODE=admin -p 3010:3010 ...
# For public portal: docker run -e NEXT_PUBLIC_APP_MODE=public -p 3020:3020 ...
CMD ["npm", "start"]