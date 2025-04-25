FROM node:20.14.0

WORKDIR /app

COPY package*.json ./ 
COPY ./prisma .

RUN npm install
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]