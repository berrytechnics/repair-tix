# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/yarn.lock ./
RUN yarn install --production --frozen-lockfile
EXPOSE 4000

# For production
CMD ["yarn", "start"]