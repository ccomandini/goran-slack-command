const fastify = require('fastify')({ logger: true })
fastify.register(require('fastify-formbody'))
const axios = require('axios')
const { memeCreator } = require('./meme_creator')
const dotenv = require('dotenv').config()
const pino = require('pino')
const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
})

if (dotenv.error) {
  throw new Error(dotenv.error)
}

fastify.get('/', async (request, reply) => {
  const status = await memeCreator.healthCheckMemeGenerator()
  return { serverStatus: status }
})

const replyInSlackChannel = async (requestBody) => {
  try {
    const selfSignedUrl = await memeCreator.memeResponseGenerator(requestBody.text, requestBody.user_name)
    const opening = await memeCreator.getMemeOpening()
    if (selfSignedUrl) {
      const resp = await axios({
        method: 'post',
        url: requestBody.response_url,
        data: {
          response_type: 'in_channel',
          attachments: [
            {
              fallback: '🧙 You just got a pearl of widsom from goranify 🤌',
              text: opening,
              image_url: `${selfSignedUrl}`
            }
          ]
        }
      })
      logger.info(`slack call status ${resp.status}`)
      // record stats about who is using it
    }
  } catch (e) {
    logger.warn(e)
  }
}

/*
    See the readme for an example of req.body
*/
fastify.post('/slack/command', async (req, reply) => {
  const msg = await memeCreator.getFirstReply()
  reply.send(msg)
  // console.log(req.body)
  try {
    replyInSlackChannel(req.body)
  } catch (e) {
    logger.error(e)
  }
})

const start = async () => {
  try {
    await memeCreator.initMemeGenerator() // set up temp folder and other required stuff before starting
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }

  try {
    await fastify.listen(3000, '0.0.0.0')
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}

start() // launch the server
