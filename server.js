const fastify = require('fastify')({ logger: true })
fastify.register(require('fastify-formbody'))
const axios = require('axios')
const { memeResponseGenerator, initMemeGenerator, healthCheckMemeGenerator } = require('./meme_creator')

fastify.get('/', async (request, reply) => {
  const len = await healthCheckMemeGenerator()
  return { serverStatus: `OK ${len}` }
})

const replyInSlackChannel = async (requestBody) => {
  try {
    const selfSignedUrl = await memeResponseGenerator(requestBody.text)
    if (selfSignedUrl) {
      const resp = await axios({
        method: 'post',
        url: requestBody.response_url,
        data: {
          response_type: 'in_channel',
          attachments: [
            {
              fallback: 'Required plain-text summary of the attachment.',
              text: 'My mom always said life was like a box of chocolates.\nYou never know what you\'re gonna get.\nThis is what i have for you today',
              image_url: `${selfSignedUrl}`
            }
          ]
        }
      })
      console.log(`slack call status ${resp.status}`)
    }
  } catch (e) {
    fastify.log(e)
  }
}

/*
    See the readme for an example of req.body
*/
fastify.post('/slack/command', (req, reply) => {
  reply.send('🤔 ... guru is musing ... 🤯')
  // console.log(req.body)
  try {
    replyInSlackChannel(req.body)
  } catch (e) {
    console.log(e)
  }
})

const start = async () => {
  try {
    await initMemeGenerator() // set up temp folder and other required stuff before starting
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }

  try {
    await fastify.listen(3000, '0.0.0.0')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start() // launch the server
