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
# Copy only necessary files for development
COPY --from=build /app/package.json /app/yarn.lock ./
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/.next ./.next
RUN yarn install --production --frozen-lockfile
EXPOSE 3000

# For production
# CMD ["yarn", "start"]

# For development 
CMD ["yarn", "dev"]