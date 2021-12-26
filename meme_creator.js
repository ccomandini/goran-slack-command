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

if (dotenv.error) {
  throw new Error(dotenv.error)
}

// google storage setup
const storage = new Storage({
  projectId: process.env.googleStorageProjectId,
  keyFilename: process.env.serviceAccountFile
})

const bucketName = process.env.bucketName

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

    await this.saveFileOnCloudStorage(imagePath, memeID)

    await this.saveMemeOnDB(imagePath, memeID)

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
        logger.debug(`meme for author ${authorSanitized}`)
        person = memeConfig.people.find(p => p.name === authorSanitized)
        if (person) {
          personIdx = -1
          const sentences = memeConfig.sentences.filter(x => x.who === undefined || x.who === authorSanitized || x.who === '')
          // i can use a generic sentence with no author or sentences by the author but not sentences of other authors
          logger.debug(`filtered sentences len > ${sentences.length}`)
          sentenceIdx = randomIntFromInterval(0, sentences.length - 1)
          sentence = sentences[sentenceIdx]
        } else {
          // if someone searched for an author not present, i will use the duck
          personIdx = -2
          person = { name: 'duck', photo: 'duck.png' }
          // i can use a generic sentence with no author
          const sentences = memeConfig.sentences.filter(x => x.who === undefined)
          sentenceIdx = randomIntFromInterval(0, sentences.length - 1)
          sentence = sentences[sentenceIdx]
        }
      } else {
        // command invoked without specifying the author, pick a random one
        personIdx = randomIntFromInterval(0, memeConfig.people.length - 1)
        person = memeConfig.people[personIdx]
        const sentences = memeConfig.sentences.filter(x => x.who === undefined || x.who === person.name || x.who === '')
        // i can use a generic sentence with no author or sentences by the author selected randomly
        logger.info(`filtered sentences len > ${sentences.length}`)
        sentenceIdx = randomIntFromInterval(0, sentences.length - 1)
        sentence = sentences[sentenceIdx]
      }

      logger.debug(`idx ${sentenceIdx} >>> ${JSON.stringify(sentence)}`)
      logger.debug(`idx ${personIdx} >>> ${JSON.stringify(person)}`)

      const topline = sentence.top
      const bottomline = sentence.bottom

      const memeID = `${person.name}_${sentence.id}`
      logger.info(`memeID >> ${memeID}`)
      const isMemeAvailable = await this.fetchMemeFromDB(memeID)
      logger.info(`isMemeAvailable >> ${isMemeAvailable}`)
      if (isMemeAvailable) {
        selfSignedUrl = await this.getSelfSignedUrl(memeID)
        if (selfSignedUrl) {
          return selfSignedUrl
        } else {
          logger.warn('Generation of self signed url for cached meme failed')
        }
      }

      logger.info('no cached version, meme generation')

      // if not create the meme and store it in google storage
      imagePath = await this.memeBuilder(memeID, person.photo, topline, bottomline)

      logger.debug(`meme generated ${imagePath}`)
      selfSignedUrl = await this.getSelfSignedUrl(memeID)

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

  getSelfSignedUrl: async function (memeID) {
    /* slack is not happy with temporary urls.
    files are not public and the url is the public one
    const selfSignedUrlOptions = {
      version: 'v2', // defaults to 'v2' if missing.
      action: 'read',
      expires: Date.now() + 1000 * 60 * 5 // 5mins
    }
    const selfSignedUrl = await storage.bucket(bucketName).file(memeID).getSignedUrl(selfSignedUrlOptions)
    return selfSignedUrl
    */
    return `https://storage.googleapis.com/${bucketName}/${memeID}`
  },

  saveFileOnCloudStorage: async function (imagePath, memeID) {
    await storage.bucket(bucketName).upload(imagePath, { destination: memeID })
    await storage.bucket(bucketName).file(memeID).makePublic()
  },

  fetchMemeFromDB: async function (memeID) {
    // check if already into the db, this is an optimization for not re-creating the meme if already present
    const rs = sqlite.run('SELECT meme_google_storage_path FROM memes WHERE meme_id = \'' + memeID + '\'  LIMIT 1')
    if (rs.error) {
      logger.error(`db error >>> ${rs.error}`)
      return false
    } else {
      return rs && rs.length === 1
    }
  },

  saveMemeOnDB: async function (imagePath, memeID) {
    logger.debug('saving on db...')

    const res = sqlite.insert('memes', { meme_google_storage_path: imagePath, meme_id: memeID })

    if (res.error) {
      logger.info(`error during saving on db >>> ${res.error}`)
    } else {
      logger.info('saved on db')
    }
  },

  dbWarmUp: async function () {
    logger.info(`DB file ${process.env.dbFile}`)
    sqlite.connect(process.env.dbFile)
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
      logger.info('temp folder creation')
      fs.mkdirSync(dir)
    } else {
      logger.info('temp folder deletion')
      fs.rmSync(dir, { recursive: true, force: true })
      logger.info('temp folder creation')
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
    logger.debug(`firstReplyIdx: ${firstReplyIdx} => ${reply}`)
    return reply
  },

  getMemeOpening: async () => {
    const idx = randomIntFromInterval(0, memeConfig.memeOpeningSentences.length - 1)
    const reply = memeConfig.memeOpeningSentences[idx]
    return reply
  }

}

exports.memeCreator = memeCreator
// functions are probably more efficient during treeshaking but atm the object looks easier to be tested
// exports.healthCheckMemeGenerator = healthCheckMemeGenerator
// exports.memeResponseGenerator = memeResponseGenerator
// exports.initMemeGenerator = initMemeGenerator
