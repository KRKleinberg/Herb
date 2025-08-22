FROM node:lts-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && \
	apt-get upgrade -y && \
	apt-get install -y --no-install-recommends build-essential && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["npm", "start"]