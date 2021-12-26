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
const dotenv = require('dotenv').config()


// google storage setup
const storage = new Storage({
  projectId: 'slackcommands-336122',
  keyFilename: '../slackcommands-336122-68f2e850d7b0.json'
})

const bucketName = 'goran-meme'

const memeConfig = require('./config_files/db.json')

const randomIntFromInterval = (min, max) => { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const memeCreator = {

  memeBuilder: async function (memeID, photo, topline, bottomline) {
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
  },

  memeResponseGenerator: async function (author, userWhoRequestedTheMeme) {
    let imagePath
    let selfSignedUrl
    try {
      let sentence; let person; let sentenceIdx; let personIdx

      if (author) {
      // if there is an author into the command sent by slack i will try to load that author
        const authorSanitized = author.toLowerCase().trim()
        logger.info(`meme for author ${authorSanitized}`)
        person = memeConfig.people.find(p => p.name === authorSanitized)
        if (person) {
          personIdx = -1
          const sentences = memeConfig.sentences.filter(x => x.who === undefined || x.who === authorSanitized || x.who === '')
          // i can use a generic sentence with no author or sentences by the author
          logger.info(`filtered sentences len > ${sentences.length}`)
          sentenceIdx = randomIntFromInterval(0, sentences.length - 1)
          sentence = sentences[sentenceIdx]
        } else {
        // if someone searched for an author not present, i will use the duck
          personIdx = -2
          person = { name: 'duck', photo: 'duck.png' }
          sentenceIdx = randomIntFromInterval(0, memeConfig.sentences.length - 1)
          sentence = memeConfig.sentences[sentenceIdx]
        }
      } else {
      // command invoked without specifying the author
        sentenceIdx = randomIntFromInterval(0, memeConfig.sentences.length - 1)
        personIdx = randomIntFromInterval(0, memeConfig.people.length - 1)
        person = memeConfig.people[personIdx]
        sentence = memeConfig.sentences[sentenceIdx]
      }

      logger.info(`idx ${sentenceIdx} >>> ${JSON.stringify(sentence)}`)
      logger.info(`idx ${personIdx} >>> ${JSON.stringify(person)}`)

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

      logger.info('no cached version, meme generation')

      // if not create the meme and store it in google storage
      imagePath = await this.memeBuilder(memeID, person.photo, topline, bottomline)

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
  },

  dbWarmUp: async function () {
    sqlite.connect('./meme.sqlite.db')
    const rs = sqlite.run('SELECT meme_id FROM memes ORDER BY id DESC LIMIT 0,1')
    if (rs.error) {
      await this.createDB()
    } else {
      logger.info('db present and ready')
    }
  },

  createDB: async function () {
    logger.info('missing db, creation in progress...')
    const res = sqlite.run('CREATE TABLE memes(id  INTEGER PRIMARY KEY AUTOINCREMENT, meme_google_storage_path TEXT NOT NULL, meme_id TEXT NOT NULL);')
    if (res.error) {
      logger.error('problem during db creation ' + res.error)
      throw new Error('problem during db creation >>' + res.error)
    } else {
      logger.info('db created!')
    }
  },

  initMemeGenerator: async function () {
    const dir = './tmp'
    if (!fs.existsSync(dir)) {
      logger.info('temp folder setup')
      fs.mkdirSync(dir)
    }
    logger.info('db setup')
    await this.dbWarmUp()
    logger.info('init completed')
  },

  healthCheckMemeGenerator: async () => {
    return { config: memeConfig !== undefined, people: memeConfig.people.length, sentences: memeConfig.sentences.length }
  },

  getFirstReply: async () => {
    const firstReplyIdx = randomIntFromInterval(0, memeConfig.firstReplyOptions.length - 1)
    const reply = memeConfig.firstReplyOptions[firstReplyIdx]
    logger.info(`firstReplyIdx: ${firstReplyIdx} => ${reply}`)
    return reply
  },

  getMemeOpening: async () => {
    const idx = randomIntFromInterval(0, memeConfig.memeOpeningSentences.length - 1)
    const reply = memeConfig.memeOpeningSentences[idx]
    return reply
  }

}

exports.memeCreator = memeCreator
// exports.healthCheckMemeGenerator = healthCheckMemeGenerator
// exports.memeResponseGenerator = memeResponseGenerator
// exports.initMemeGenerator = initMemeGenerator
