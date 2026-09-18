FROM node:alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . . 
# Copy all files to the working directory. Why is it after installing dependencies? 
# This allows Docker to cache the npm install layer, so it doesn't have to reinstall dependencies if only the application code changes.

RUN npm run build

CMD ["npm", "start"]