FROM node:22-alpine
WORKDIR /app

COPY index.js /app
COPY package.json /app
COPY yarn.lock /app

RUN yarn install --frozen-lockfile

CMD ["node", "index.js"]