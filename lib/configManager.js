const path = require('path')
const yaml = require('js-yaml')
const env = require('./env')

module.exports = class ConfigManager {
  constructor (context, ref) {
    this.context = context
    this.ref = ref
    this.log = context.log
  }

  /**
   * Loads a file from GitHub
   *
   * @param params Params to fetch the file with
   * @return The parsed YAML file
   */
  static async loadYaml (octokit, params) {
    try {
      const response = await octokit.repos.getContent(params)

      // Ignore in case path is a folder
      // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-directory
      if (Array.isArray(response.data)) {
        return null
      }
      // we don't handle symlinks or submodule
      // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-symlink
      // - https://developer.github.com/v3/repos/contents/#response-if-content-is-a-submodule
      if (typeof response.data.content !== 'string') {
        return
      }
      return yaml.load(Buffer.from(response.data.content, 'base64').toString()) || {}
    } catch (e) {
      if (e.status === 404) {
        return null
      }
      throw e
    }
  }

  /**
   * Loads the settings file from GitHub
   *
   * @return The parsed YAML file
   */
  async loadGlobalSettingsYaml () {
    const CONFIG_PATH = env.CONFIG_PATH
    const filePath = path.posix.join(CONFIG_PATH, env.SETTINGS_FILE_PATH)
    return ConfigManager.loadYaml(this.context.octokit, {
      owner: this.context.repo().owner,
      repo: env.ADMIN_REPO,
      path: filePath,
      ref: this.ref
    })
  }
}
