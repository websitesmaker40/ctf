FROM node:lts

WORKDIR /app
COPY .yarn .yarn
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install
COPY . .
RUN yarn build
ENV NODE_ENV=production
CMD ["yarn", "start"]
