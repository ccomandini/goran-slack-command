const memeMaker = require('meme-maker')
const fs = require('fs')
const { Storage } = require('@google-cloud/storage')
const util = require('util')
const sqlite = require('sqlite-sync')
const pino = require('pino')
const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
})

// google storage setup
const storage = new Storage({
  projectId: 'slackcommands-336122',
  keyFilename: '../slackcommands-336122-68f2e850d7b0.json'
})

const bucketName = 'goran-meme'

function randomIntFromInterval (min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const memeConfig = require('./config_files/db.json')

const memeCreator = async (memeID, photo, topline, bottomline) => {
  const imagePath = `./tmp/${memeID}.png`

  const options = {
    image: `./photos/${photo}`, // Required
    outfile: imagePath, // Required
    topText: topline, // Required
    bottomText: bottomline, // Optional
    fontSize: 60, // Optional
    fontFill: '#FFF', // Optional
    textPos: 'center', // Optional
    strokeColor: '#000', // Optional
    strokeWeight: 3 // Optional
  }
  const asyncMemeMaker = util.promisify(memeMaker)

  await asyncMemeMaker(options)

  await storage.bucket(bucketName).upload(imagePath, { destination: memeID })

  logger.info('saving on db...')

  const res = sqlite.insert('memes', { meme_google_storage_path: imagePath, meme_id: memeID })

  if (res.error) {
    logger.info(`error during saving on db >>> ${res.error}`)
  } else {
    logger.info('saved')
  }

  return imagePath
}

const memeResponseGenerator = async (author) => {
  let imagePath
  let selfSignedUrl
  try {

    const sentence = memeConfig.sentences[randomSentenceIdx]
    const person = memeConfig.people[randomPersonIdx]

    if (author){
      logger.info(`meme for author ${author}`)
      const randomSentenceIdx = randomIntFromInterval(0, memeConfig.sentences.length - 1)
      const randomPersonIdx = randomIntFromInterval(0, memeConfig.people.length - 1)
    }else{
      const randomSentenceIdx = randomIntFromInterval(0, memeConfig.sentences.length - 1)
      const randomPersonIdx = randomIntFromInterval(0, memeConfig.people.length - 1)
    }

    logger.info(`idx ${randomSentenceIdx} >>> ${JSON.stringify(sentence)}`)
    logger.info(`idx ${randomPersonIdx} >>> ${JSON.stringify(person)}`)

    const topline = sentence.top
    const bottomline = sentence.bottom

    const memeID = `${person.name}_${sentence.id}`

    const selfSignedUrlOptions = {
      version: 'v2', // defaults to 'v2' if missing.
      action: 'read',
      expires: Date.now() + 1000 * 60 * 5 // 5mins
    }

    // check if already into the db, this is an optimization for not re-creating the meme if already present
    const rs = sqlite.run('SELECT meme_google_storage_path FROM memes WHERE meme_id = \'' + memeID + '\'  LIMIT 1')
    if (rs.error) {
      logger.error(`db error >>> ${rs.error}`)
    } else {
      if (rs && rs.length === 1) {
        const memeGoogleStoragePath = rs[0].meme_google_storage_path
        logger.info(`cached memeGoogleStoragePath == ${memeGoogleStoragePath}`)
        selfSignedUrl = await storage.bucket(bucketName).file(memeID).getSignedUrl(selfSignedUrlOptions)
        if (selfSignedUrl) {
          return selfSignedUrl
        } else {
          logger.warn('Generation of self signed url for cached meme failed')
        }
      }
    }

    logger.info('meme generation')

    // if not create the meme and store it in google storage
    imagePath = await memeCreator(memeID, person.photo, topline, bottomline)

    selfSignedUrl = await storage.bucket(bucketName).file(memeID).getSignedUrl(selfSignedUrlOptions)

    try {
      if (imagePath) {
        fs.unlinkSync(imagePath)
      }
    } catch (err) {
      logger.error(err)
    }
  } catch (err) {
    logger.error(err)
    try {
      if (imagePath) {
        fs.unlinkSync(imagePath)
      }
    } catch (err) {
      logger.error(err)
    }
  }

  // logger.info(`selfSignedUrl >> ${selfSignedUrl}`)

  return selfSignedUrl
}

const dbWarmUp = async () => {
  sqlite.connect('./meme.sqlite.db')
  const rs = sqlite.run('SELECT meme_id FROM memes ORDER BY id DESC LIMIT 0,1')
  if (rs.error) {
    await createDB()
  } else {
    logger.info('db present and ready')
  }
}

const createDB = async () => {
  logger.info('missing db, creation in progress...')
  const res = sqlite.run('CREATE TABLE memes(id  INTEGER PRIMARY KEY AUTOINCREMENT, meme_google_storage_path TEXT NOT NULL, meme_id TEXT NOT NULL);')
  if (res.error) {
    logger.error('problem during db creation ' + res.error)
    throw new Error('problem during db creation >>' + res.error)
  } else {
    logger.info('db created!')
  }
}

const initMemeGenerator = async () => {
  const dir = './tmp'
  if (!fs.existsSync(dir)) {
    logger.info('temp folder setup')
    fs.mkdirSync(dir)
  }
  logger.info('db setup')
  await dbWarmUp()
  logger.info('init completed')
}

const healthCheckMemeGenerator = async () => {
  return memeConfig.sentences.length
}

exports.healthCheckMemeGenerator = healthCheckMemeGenerator
exports.memeResponseGenerator = memeResponseGenerator
exports.initMemeGenerator = initMemeGenerator
