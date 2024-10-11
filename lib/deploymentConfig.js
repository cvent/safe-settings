const yaml = require('js-yaml')
const fs = require('fs')
const env = require('./env')

/**
 * Class representing a deployment config.
 * The settings are loaded from the deployment-settings.yml file during initialization and stored as fields.
 */
class DeploymentConfig {
  constructor () {
    const deploymentConfigPath = process.env.DEPLOYMENT_CONFIG_FILE ? process.env.DEPLOYMENT_CONFIG_FILE : 'deployment-settings.yml'

    let config = {}
    if (fs.existsSync(deploymentConfigPath)) {
      config = yaml.load(fs.readFileSync(deploymentConfigPath))
    }

    this.overrideValidators = {}
    if (config.overridevalidators) {
      if (!Array.isArray(config.overridevalidators)) {
        throw new Error('overridevalidators must be an array')
      }
      for (const validator of config.overridevalidators) {
        // eslint-disable-next-line no-new-func
        const f = new Function('baseconfig', 'overrideconfig', 'githubContext', validator.script)
        this.overrideValidators[validator.plugin] = { canOverride: f, error: validator.error }
      }
    }

    this.configValidators = {}
    if (config.configvalidators) {
      if (!Array.isArray(config.configvalidators)) {
        throw new Error('configvalidators must be an array')
      }
      for (const validator of config.configvalidators) {
        // eslint-disable-next-line no-new-func
        const f = new Function('baseconfig', 'githubContext', validator.script)
        this.configvalidators[validator.plugin] = { isValid: f, error: validator.error }
      }
    }

    this.restrictedRepos = config.restrictedRepos ?? ['admin', '.github', 'safe-settings']

    this.unsafeFields = []
    // eslint-disable-next-line dot-notation
    if (config['unsafe_fields']) {
      // eslint-disable-next-line dot-notation
      if (!Array.isArray(config['unsafe_fields'])) {
        throw new Error('unsafe_fields must be an array')
      }
      // eslint-disable-next-line dot-notation
      this.unsafeFields = config['unsafe_fields']
    }
  }
}

DeploymentConfig.FILE_NAME = `${env.CONFIG_PATH}/settings.yml`

module.exports = DeploymentConfig
