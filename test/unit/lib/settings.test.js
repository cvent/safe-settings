/* eslint-disable no-undef */

const Settings = require('../../../lib/settings')
const DeploymentConfig = require('../../../lib/deploymentConfig')

jest.mock('../../../lib/deploymentConfig')

describe('Settings Tests', () => {
  let stubContext
  let mockRepo
  let stubConfig
  let mockRef
  let mockSubOrg

  function createSettings (config) {
    return new Settings(false, stubContext, mockRepo, config, mockRef, mockSubOrg)
  }

  beforeEach(() => {
    stubContext = {
      payload: {
        installation: {
          id: 123
        }
      },
      octokit: jest.fn(),
      log: {
        debug: jest.fn((msg) => {
          console.log(msg)
        }),
        info: jest.fn((msg) => {
          console.log(msg)
        }),
        error: jest.fn((msg) => {
          console.log(msg)
        })
      }
    }

    mockRepo = jest.fn()
    mockRef = jest.fn()
    mockSubOrg = jest.fn()
  })

  describe('restrictedRepos', () => {
    describe('restrictedRepos not defined', () => {
      beforeEach(() => {
        DeploymentConfig.mockImplementation(() => ({
          restrictedRepos: {}
        }))
        stubConfig = {}
      })

      it('Allow repositories being configured', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('my-repo')).toEqual(false)
        expect(settings.isRestricted('another-repo')).toEqual(false)
      })

      it('Do not allow default excluded repositories being configured', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('.github')).toEqual(false)
        expect(settings.isRestricted('safe-settings')).toEqual(false)
        expect(settings.isRestricted('admin')).toEqual(false)
      })
    })

    describe('restrictedRepos.exclude defined', () => {
      beforeEach(() => {
        DeploymentConfig.mockImplementation(() => ({
          restrictedRepos: {
            exclude: ['foo', '.*-test$', '^personal-.*$']
          }
        }))
        stubConfig = {}
      })

      it('Skipping excluded repository from being configured', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('foo')).toEqual(true)
      })

      it('Skipping excluded repositories matching regex in restrictedRepos.exclude', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('my-repo-test')).toEqual(true)
        expect(settings.isRestricted('personal-repo')).toEqual(true)
      })

      it('Allowing repositories not matching regex in restrictedRepos.exclude', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('my-repo-test-data')).toEqual(false)
        expect(settings.isRestricted('personalization-repo')).toEqual(false)
      })
    })

    describe('restrictedRepos.include defined', () => {
      beforeEach(() => {
        DeploymentConfig.mockImplementation(() => ({
          restrictedRepos: {
            include: ['foo', '.*-test$', '^personal-.*$']
          }
        }))
        stubConfig = {}
      })

      it('Allowing repository from being configured', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('foo')).toEqual(false)
      })

      it('Allowing repositories matching regex in restrictedRepos.include', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('my-repo-test')).toEqual(false)
        expect(settings.isRestricted('personal-repo')).toEqual(false)
      })

      it('Skipping repositories not matching regex in restrictedRepos.include', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('my-repo-test-data')).toEqual(true)
        expect(settings.isRestricted('personalization-repo')).toEqual(true)
      })
    })

    describe('restrictedRepos empty', () => {
      it('Allowing all repositories if restrictedRepos is empty', () => {
        DeploymentConfig.mockImplementation(() => ({
          restrictedRepos: []
        }))
        stubConfig = {}
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('my-repo')).toEqual(false)
      })
    })
  }) // restrictedRepos
}) // Settings Tests
