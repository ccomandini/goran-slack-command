const fastify = require('fastify')({ logger: true });
const memeMaker = require('meme-maker');
const fs = require('fs');
const {Storage} = require('@google-cloud/storage');
const util = require('util');
const axios = require('axios');
const sentences = require('./sentences.json');

const bucketName = 'goran-meme';

const storage = new Storage({
    projectId: 'slackcommands-336122',
    keyFilename: '../slackcommands-336122-68f2e850d7b0.json'
});

const selfSignedUrlOptions = {
    version: 'v2', // defaults to 'v2' if missing.
    action: 'read',
    expires: Date.now() + 1000 * 60 * 5, //5mins
};

fastify.register(require('fastify-formbody'))

fastify.get('/', async (request, reply) => {
    return { serverStatus: `OK ${sentences.length}` }
});

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}
  

const memeResponseGenerator = async (requestBody) => {
    let imagePath;
    try {
        //console.log(requestBody);
    
        let imagePath = `/tmp/${requestBody.trigger_id}.png`

        const randomSentenceIdx = randomIntFromInterval(0, sentences.length);

        const topline = sentences[randomSentenceIdx].top;
        const bottomline = sentences[randomSentenceIdx].bottom;

        let options = {
            image: './goran.png',         // Required
            outfile: imagePath,  // Required
            topText: topline,            // Required
            bottomText: bottomline,           // Optional
            fontSize: 60,                   // Optional
            fontFill: '#FFF',               // Optional
            textPos: 'center',              // Optional
            strokeColor: '#000',            // Optional
            strokeWeight: 3                 // Optional
        };
        const asyncMemeMaker = util.promisify(memeMaker);
        
        await asyncMemeMaker(options);

        const bucketFileId = `${requestBody.trigger_id}`;

        bucketFile = await storage.bucket(bucketName).upload(imagePath, {destination: bucketFileId,});
            
        selfSignedUrl = await storage.bucket(bucketName).file(bucketFileId).getSignedUrl(selfSignedUrlOptions);

        //console.log(`call ${requestBody.response_url} with ${selfSignedUrl}`);

        resp = await axios({
            method: 'post',
            url: requestBody.response_url,
            data: {
                "attachments": [
                    {
                        "fallback": "Required plain-text summary of the attachment.",
                        "text": "Take this",
                        "image_url": `${selfSignedUrl}`
                    }
                ]
            }
        });

        console.log(`slack call status ${resp.status}`);
        
    } catch(err) {
        console.error(err);
    } finally{
        try {
            if(imagePath){
                fs.unlinkSync(imagePath);
            }
        } catch(err) {
            console.error(err);
        }
    };
    

};


fastify.post('/slack/command', (req, reply) => {
    reply.send('... wait, i am thinking ...');
    /*
    {
        token: 'G3CQHFWBKzb7I2gxJTzKS9s6',
        team_id: 'T4DK57363',
        team_domain: 'sayvero',
        channel_id: 'D01FKBW0S23',
        channel_name: 'directmessage',
        user_id: 'U01GCNSSQC9',
        user_name: 'claudio',
        command: '/goran',
        text: '',
        api_app_id: 'A02RR3MPACE',
        is_enterprise_install: 'false',
        response_url: 'https://hooks.slack.com/commands/T4DK57363/2878922010981/4wHDzlQ7boQ694ToUyUmfdXQ',
        trigger_id: '2884140174980.149651241207.64abe0c64920c344d17cff322311eeea'
    }
    */
    try{
        memeResponseGenerator(req.body);
    }catch(e){
        console.log(e);
    }
  })



// Run the server!
const start = async () => {
    try {
        await fastify.listen(3000)
    } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start();