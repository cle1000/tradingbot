# Set node js
FROM node:carbon


# Set the working directory to /app
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./


RUN npm install
# If you are building your code for production
# RUN npm install --only=production
COPY . .


EXPOSE 8080

CMD [ "npm", "run", "start" ]
