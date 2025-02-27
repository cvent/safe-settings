/* eslint-disable no-undef */
const { Octokit } = require('octokit')
const Settings = require('../../../lib/settings')
const yaml = require('js-yaml')
// jest.mock('../../../lib/settings', () => {
//   const OriginalSettings = jest.requireActual('../../../lib/settings')
//   //const orginalSettingsInstance = new OriginalSettings(false, stubContext, mockRepo, config, mockRef, mockSubOrg)
//   return OriginalSettings
// })

let settings

describe('Settings Tests', () => {
  let stubContext
  let mockRepo
  let stubConfig
  let mockRef
  let mockSubOrg
  let subOrgConfig

  function createSettings(config) {
    const settings = new Settings(false, stubContext, mockRepo, config, mockRef, mockSubOrg)
    return settings
  }

  beforeEach(() => {
    const mockOctokit = jest.mocked(Octokit)
    const content = Buffer.from(`
suborgrepos:    
- new-repo        
#- test*    
#- secret*  
     
suborgteams:
- core

suborgproperties:     
- EDP: true
- do_no_delete: true
       
teams:                 
  - name: core        
    permission: bypass 
  - name: docss
    permission: pull
  - name: docs
    permission: pull
  
validator:
  pattern: '[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+.*' 

repository:   
  # A comma-separated list of topics to set on the repository
  topics:   
  - frontend
     `).toString('base64')
    mockOctokit.repos = {
      getContent: jest.fn().mockResolvedValue({ data: { content } })
    }

    mockOctokit.request = {
      endpoint: jest.fn().mockReturnValue({})
    }

    mockOctokit.paginate = jest.fn().mockResolvedValue([])

    stubContext = {
      payload: {
        installation: {
          id: 123
        }
      },
      octokit: mockOctokit,
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

    mockRepo = { owner: 'test', repo: 'test-repo' }
    mockRef = 'main'
    mockSubOrg = 'frontend'
  })

  describe('restrictedRepos', () => {
    describe('restrictedRepos is empty object', () => {
      beforeEach(() => {
        stubConfig = {
          deploymentConfig: {
            restrictedRepos: {}
          }
        }
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

    describe('restrictedRepos is not present', () => {
      beforeEach(() => {
        stubConfig = {
          deploymentConfig: {}
        }
      })

      it('throws TypeError', () => {
        settings = createSettings(stubConfig)
        expect(() => settings.isRestricted('my-repo')).toThrow('Cannot read properties of undefined (reading \'include\')')
      })
    })

    describe('restrictedRepos is null', () => {
      beforeEach(() => {
        stubConfig = {
          deploymentConfig: {
            restrictedRepos: null
          }
        }
      })

      it('throws TypeError', () => {
        settings = createSettings(stubConfig)
        expect(() => settings.isRestricted('my-repo')).toThrow('Cannot read properties of null (reading \'include\')')
      })
    })

    describe('restrictedRepos is empty array', () => {
      beforeEach(() => {
        stubConfig = {
          deploymentConfig: {
            restrictedRepos: []
          }
        }
      })

      it('allows all repositories', () => {
        settings = createSettings(stubConfig)
        expect(settings.isRestricted('my-repo')).toEqual(false)
      })
    })

    describe('restrictedRepos also defined in runtimeConfig', () => {
      beforeEach(() => {
        stubConfig = {
          deploymentConfig: {
            restrictedRepos: ['admin', '.github', 'safe-settings']
          },
          runtimeConfig: {
            restrictedRepos: ['foo', 'bar']
          }
        }
      })

      it('ignores restrictedRepos from runtimeConfig', () => {
        settings = createSettings(stubConfig)
        expect(settings.restrictedRepos).toMatchObject(['admin', '.github', 'safe-settings'])
      })
    })

    describe('restrictedRepos.exclude defined', () => {
      beforeEach(() => {
        stubConfig = {
          deploymentConfig: {
            restrictedRepos: {
              exclude: ['foo', '.*-test$', '^personal-.*$']
            }
          }
        }
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
        stubConfig = {
          deploymentConfig: {
            restrictedRepos: {
              include: ['foo', '.*-test$', '^personal-.*$']
            }
          }
        }
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
  }) // restrictedRepos

  describe('loadConfigs', () => {
    describe('load suborg configs', () => {
      beforeEach(() => {
        stubConfig = {
          deploymentConfig: {
            restrictedRepos: {}
          }
        }
        subOrgConfig = yaml.load(`
          suborgrepos:    
          - new-repo         
               
          suborgproperties:     
          - EDP: true
          - do_no_delete: true
                 
          teams:                 
            - name: core        
              permission: bypass 
            - name: docss
              permission: pull
            - name: docs
              permission: pull
            
          validator:
            pattern: '[a-zA-Z0-9_-]+_[a-zA-Z0-9_-]+.*' 
          
          repository:   
            # A comma-separated list of topics to set on the repository
            topics:   
            - frontend
          
          `)

      })

      it("Should load configMap for suborgs'", async () => {
        //mockSubOrg = jest.fn().mockReturnValue(['suborg1', 'suborg2'])
        mockSubOrg = undefined
        settings = createSettings(stubConfig)
        jest.spyOn(settings, 'loadConfigMap').mockImplementation(() => [{ name: "frontend", path: ".github/suborgs/frontend.yml" }])
        jest.spyOn(settings, 'loadYaml').mockImplementation(() => subOrgConfig)
        jest.spyOn(settings, 'getReposForTeam').mockImplementation(() => [{ name: 'repo-test' }])
        jest.spyOn(settings, 'getReposForCustomProperty').mockImplementation(() => [{ repository_name: 'repo-for-property' }])

        const subOrgConfigs = await settings.getSubOrgConfigs()
        expect(settings.loadConfigMap).toHaveBeenCalledTimes(1)

        // Get own properties of subOrgConfigs
        const ownProperties = Object.getOwnPropertyNames(subOrgConfigs);
        expect(ownProperties.length).toEqual(3)
      })

      it("Should throw an error when a repo is found in multiple suborgs configs'", async () => {
        //mockSubOrg = jest.fn().mockReturnValue(['suborg1', 'suborg2'])
        mockSubOrg = undefined
        settings = createSettings(stubConfig)
        jest.spyOn(settings, 'loadConfigMap').mockImplementation(() => [{ name: "frontend", path: ".github/suborgs/frontend.yml" }, { name: "backend", path: ".github/suborgs/backend.yml" }])
        jest.spyOn(settings, 'loadYaml').mockImplementation(() => subOrgConfig)
        jest.spyOn(settings, 'getReposForTeam').mockImplementation(() => [{ name: 'repo-test' }])
        jest.spyOn(settings, 'getReposForCustomProperty').mockImplementation(() => [{ repository_name: 'repo-for-property' }])

        expect(async () => await settings.getSubOrgConfigs()).rejects.toThrow('Multiple suborg configs for new-repo in .github/suborgs/backend.yml and .github/suborgs/frontend.yml')
        // try {
        //   await settings.getSubOrgConfigs()
        // } catch (e) {
        //   console.log(e)
        // }
      })
    })
  }) // loadConfigs

}) // Settings Tests
