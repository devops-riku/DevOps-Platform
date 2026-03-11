FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Usually for dev we keep it interactive or with npm run dev
# For this platform, let's build it for a "stable" dev experience
CMD ["npm", "run", "dev"]
