
git pull

cd front
docker build -t ai:latest .
docker stop ai-front
sleep 1
docker run -p 6060:4173 -d --rm --name ai-front ai:latest

# back
cd ../back
echo "Installing dependencies, generating Prisma client, and building the project..."
npm i
npx prisma generate
npm run build

echo "Stopping PM2 process..."
pm2 stop ai-back || true 

PORT=3025
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "Port $PORT is in use. Killing the process..."
  fuser -k $PORT/tcp
else
  echo "Port $PORT is free."
fi

echo "Starting PM2 process..."
pm2 start ecosystem.config.js

# cd ../bot
# pm2 stop ai-bot
# pm2 start ecosystem.config.js