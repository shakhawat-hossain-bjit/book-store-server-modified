# Use an official Node.js runtime as a parent image
FROM node:latest

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js application dependencies
RUN npm install

# Copy the rest of your application code to the working directory
COPY . .

# Expose the port your Express app listens on (usually 3000)
EXPOSE 8080

# Command to start your Express application
CMD ["node", "app.js"]