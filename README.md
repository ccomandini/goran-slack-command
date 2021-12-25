# goran-slack-command

## Info

https://api.slack.com/interactivity/slash-commands


## Vero's 

https://api.slack.com/apps/A02RR3MPACE/slash-commands

## Meme generation

https://npm.io/package/meme-maker

```Install imageMagick```

https://imagemagick.org/index.php

## Server fastify
 
https://www.fastify.io/docs/latest/
https://github.com/fastify/fastify-formbody


## Cloud google

https://www.npmjs.com/package/@google-cloud/storage

https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadFile.js

https://github.com/googleapis/nodejs-storage/blob/main/samples/generateSignedUrl.js

you need a file ```slackcommands-336122-68f2e850d7b0.json``` with the google cloud service account into the parent folder of this folder


## Run it locally

You can expose it with ngrok
```./ngrok http --region=us --hostname=ccomandini.ngrok.io 3000```

Then execute

```node server```

## Run it on server

for running it into a server you can use https://www.npmjs.com/package/forever

```[sudo] npm install forever -g```
then
```forever start server.js```

### route traffic to port 80

```sudo iptables -t nat -A OUTPUT -o lo -p tcp --dport 80 -j REDIRECT --to-port 3000```