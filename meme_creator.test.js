const { memeCreator } = require('./meme_creator')

jest.mock('@google-cloud/storage')

const spySetSelfSignedUrl = jest.spyOn(memeCreator, 'getSelfSignedUrl')
spySetSelfSignedUrl.mockReturnValue('http://www.yoyo.com')

const spySaveFileOnCloudStorage = jest.spyOn(memeCreator, 'saveFileOnCloudStorage')
spySaveFileOnCloudStorage.mockReturnValue(undefined)

const spySaveMemeOnDB = jest.spyOn(memeCreator, 'saveMemeOnDB')
spySaveMemeOnDB.mockReturnValue(undefined)

const spyFetchMemeFromDB = jest.spyOn(memeCreator, 'fetchMemeFromDB')
spyFetchMemeFromDB.mockReturnValue(false)

const spyDbWarmUp = jest.spyOn(memeCreator, 'dbWarmUp')
spyDbWarmUp.mockReturnValue(undefined)

memeCreator.initMemeGenerator()

test('memeResponseGenerator returns a url', async () => {
  return memeCreator.memeResponseGenerator('george', 'test-user').then(data => {
    expect(data).toBe('http://www.yoyo.com')
    expect(spyFetchMemeFromDB.mock.calls).toHaveLength(1)
    expect(spySaveFileOnCloudStorage.mock.calls).toHaveLength(1)
    expect(spySaveMemeOnDB.mock.calls).toHaveLength(1)
    expect(spyFetchMemeFromDB.mock.calls).toHaveLength(1)
  })
})
