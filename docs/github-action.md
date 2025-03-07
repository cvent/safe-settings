# Running Safe-settings with GitHub Actions (GHA)

This guide describes how to schedule a full safe-settings sync using GitHub Actions. This assumes that an `admin` repository has been configured with your `safe-settings` configuration. Refer to the [How to Use](../README.md#how-to-use) docs for more details on that process.


## GitHub App Creation
Follow the [Create the GitHub App](deploy.md#create-the-github-app) guide to create an App in your GitHub account. This will allow `safe-settings` to access and modify your repos.


## Defining the GitHub Action Workflow
Running a full-sync with `safe-settings` can be done via `npm run full-sync`. This requires installing Node, such as with [actions/setup-node](https://github.com/actions/setup-node) (see example below). When doing so, the appropriate environment variables must be set (see the [Environment variables](#environment-variables) document for more details).


### Example GHA Workflow
The below example uses the GHA "cron" feature to run a full-sync every 4 hours. While not required, this example uses the `.github` repo as the `admin` repo (set via `ADMIN_REPO` env var) and the safe-settings configurations are stored in the `safe-settings/` directory (set via `CONFIG_PATH` and `DEPLOYMENT_CONFIG_FILE`).

```yaml
name: Safe Settings Sync
on:
  schedule:
    - cron: "0 */4 * * *"
  workflow_dispatch: {}

jobs:
  safeSettingsSync:
    runs-on: ubuntu-latest
    steps:
      # Self-checkout of 'admin' repo for access to safe-settings config:
      - uses: actions/checkout@v4
      # Run full sync of safe-settings:
      - uses: github/safe-settings@2.1.13
        env:
          GH_ORG: ${{ vars.SAFE_SETTINGS_GH_ORG }}
          APP_ID: ${{ vars.SAFE_SETTINGS_APP_ID }}
          PRIVATE_KEY: ${{ secrets.SAFE_SETTINGS_PRIVATE_KEY }}
          GITHUB_CLIENT_ID: ${{ vars.SAFE_SETTINGS_GITHUB_CLIENT_ID }}
          GITHUB_CLIENT_SECRET: ${{ secrets.SAFE_SETTINGS_GITHUB_CLIENT_SECRET }}
          ADMIN_REPO: .github
          CONFIG_PATH: safe-settings
          DEPLOYMENT_CONFIG_FILE: ${{ github.workspace }}/safe-settings/deployment-settings.yml
```
