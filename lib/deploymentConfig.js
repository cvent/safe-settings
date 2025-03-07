const yaml = require('js-yaml')
const fs = require('fs')
const env = require('./env')

function isIterable (obj) {
  // checks for null and undefined
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}

/**
 * Class representing a deployment config.
 * The settings are loaded from the deployment-settings.yml file.
 */
module.exports = class DeploymentConfig {
  constructor (context, configPath) {
    const deploymentConfigPath = configPath ?? env.DEPLOYMENT_CONFIG_FILE

    let deploymentConfig = {}
    if (fs.existsSync(deploymentConfigPath)) {
      deploymentConfig = yaml.load(fs.readFileSync(deploymentConfigPath))
    } else {
      context.log.info(`No deployment settings found at ${deploymentConfigPath}`)
    }

    this.overridevalidators = {}
    if (isIterable(deploymentConfig.overridevalidators)) {
      for (const validator of deploymentConfig.overridevalidators) {
        // eslint-disable-next-line no-new-func
        const f = new Function('baseconfig', 'overrideconfig', 'githubContext', validator.script)
        this.overridevalidators[validator.plugin] = { canOverride: f, error: validator.error }
      }
    }

    this.configvalidators = {}
    if (isIterable(deploymentConfig.configvalidators)) {
      for (const validator of deploymentConfig.configvalidators) {
        // eslint-disable-next-line no-new-func
        const f = new Function('baseconfig', 'githubContext', validator.script)
        this.configvalidators[validator.plugin] = { isValid: f, error: validator.error }
      }
    }

    this.restrictedRepos = deploymentConfig.restrictedRepos ?? ['admin', '.github', 'safe-settings']
  }
}
