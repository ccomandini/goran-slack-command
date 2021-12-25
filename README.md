# goran-slack-command

## Info

https://api.slack.com/interactivity/slash-commands

https://stackoverflow.com/questions/42647024/slack-bot-send-an-image

https://api.slack.com/interactivity/handling#message_responses

https://api.slack.com/reference/messaging/payload


## Vero's 

https://api.slack.com/apps/A02RR3MPACE/slash-commands

## Meme generation

https://npm.io/package/meme-maker

### Install imageMagick

https://imagemagick.org/index.php

https://linoxide.com/install-latest-imagemagick-on-ubuntu-20-04/

#### ubuntu
```sudo apt update```

```sudo apt install imagemagick```

### Install graphicsmagick

http://www.graphicsmagick.org/

#### ubuntu
```sudo apt update```

```sudo apt install graphicsmagick```

## macos
```brew install imagemagick```

```brew install graphicsmagick```

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

### create a firewall rule on port 3000

## Facts
https://chucknorrisfacts.net/top-100

## ESLINT

```eslint *.js --fix```