const { memeResponseGenerator } = require('./meme_creator')
const { File, Storage, Bucket } = require('@google-cloud/storage')

jest.mock('@google-cloud/storage')

const spyStorage = jest.spyOn(Storage.prototype, 'bucket')
spyStorage.mockReturnValue({}.upload = () => {})

const spyBucket = jest.spyOn(Bucket.prototype, 'upload')
spyBucket.mockReturnValue({})

const spyFile = jest.spyOn(File.prototype, 'getSignedUrl')
spyFile.mockReturnValue('http://www.yoyo.com')

test('memeResponseGenerator returns a url', async () => {
  return memeResponseGenerator('george').then(data => {
    expect(data).toBe('peanut butter')
  })
})
