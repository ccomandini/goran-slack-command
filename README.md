# goran-slack-command

## Node

with nvm https://github.com/nvm-sh/nvm install node v16.13.1 (the latest LTS at the moment)

## Info

https://api.slack.com/interactivity/slash-commands

https://stackoverflow.com/questions/42647024/slack-bot-send-an-image

https://api.slack.com/interactivity/handling#message_responses

https://api.slack.com/reference/messaging/payload

https://api.slack.com/interactivity/slash-commands#responding_to_commands

Example of json body

```js
{
        token: 'G3CQHFWBKzb7I2gxJ346534TzKS9s6',
        team_id: 'T4DK57363',
        team_domain: 'sayvero',
        channel_id: 'D01FKBW04543S23',
        channel_name: 'directmessage',
        user_id: 'U01GCNSS453453QC9',
        user_name: 'claudio',
        command: '/goranfy',
        text: 'banana',
        api_app_id: 'A02534534RR3MPACE',
        is_enterprise_install: 'false',
        response_url: 'https://hooks.slack.com/commands/T4D53453K57363/287892201093453481/4wHD534534zlQ7boQ694ToUyUmfdXQ',
        trigger_id: '28841401743453453480.149651241207.64abe0c64920c344d17cff322311eeea'
    }
```

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

### logging

https://github.com/pinojs/pino

https://github.com/pinojs/pino-pretty


## Cloud google

https://www.npmjs.com/package/@google-cloud/storage

https://github.com/googleapis/nodejs-storage/blob/main/samples/uploadFile.js

https://github.com/googleapis/nodejs-storage/blob/main/samples/generateSignedUrl.js

you need a file like ```slackcommands-336122-68f2e850d7b0.json``` with the google cloud service account, into the `.env` file you must declare the path


## Run it locally

Create the env file 

```cp env.template .env```

edit the file just created specifying the google cloud account info (project id, bucket name and service account json file path)

You can expose it with ngrok, like

```./ngrok http --region=us --hostname=ccomandini.ngrok.io 3000```

(this is an example, you your own configuration for running it or you can use https://localtunnel.github.io/www/)

Then execute

```node server```

## Run it on server

for running it into a server you can use https://www.npmjs.com/package/forever

```[sudo] npm install forever -g```

then

```forever start server.js```

open your browser

```http://localhost:3000/```

you should see something like

```{"serverStatus":{"config":true,"people":7,"sentences":25}}```

### create a firewall rule on port 3000

## Facts and quotes
https://chucknorrisfacts.net/top-100
https://www.goodreads.com/quotes/tag/bukowski

## ESLINT

```eslint *.js --fix```

## SQLITE

https://www.npmjs.com/package/sqlite-sync


## Test references

https://www.titanwolf.org/Network/q/ac37e658-925b-46ed-b159-433e7b811c0d/y

https://jestjs.io/docs/mock-functions


## Instance used:
https://console.cloud.google.com/storage/browser/goran-meme

https://console.cloud.google.com/compute/instances?authuser=1&project=slackcommands-336122

# Automate upgrade
```
cp upgrade.sh ..
chmod +x upgrade.sh
crontab -e
```
and add this to upgrade everyday at midnight (adapt it with your home folder path)
```
0 0 * * * /bin/bash /home/c_comandini/upgrade.sh 1> /home/c_comandini/crontab.log 2> /home/c_comandini/crontab_err.log
```

## DynDns

https://www.duckdns.org/domains