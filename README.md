# CMS-gui

## Project setup

```
npm install
```

##### Compiles and hot-reloads for development

```
npm run serve
```

##### Compiles and minifies for production

```
npm run build
```

##### Lints and fixes files

```
npm run lint
```

### List of installed packages and their respective versions

```bash
npm list
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

### Runtime Environment Configuration

Webpack, or any other packer for that matter, minifies and packs files while compiling.
That is somewhat troublesome if you'd like to load configuration AFTER compiling (remember that the build-step is done BEFORE deploying and that it makes no sense to bake the configuration into the image for every deployment, since you'd have to change images...).

# Installation as of 2022-07
This project runs on NodeJS v14.15.0 and we cannot update it.
So chances are that you already have some newer version of NodeJS installed on your development machine.
To be able to switch between NodeJS versions you'll have to install a manager like [NVM (Node Version Manager)](https://github.com/coreybutler/nvm-windows).
Install that and restart all your IDEs, since they hold consoles that were started before you've installed the new program.
Then you can then enter your installation directory (of this project) and type:
```bash
# Install node v14.15.0
nvm install 14.15.0
# Get the list of installed NodeJS versions.
nvm list
# Switch the current NodeJS version to a particular one
nvm use 14
# When you want to run the other version, you can switch to that any time in a similar way.

# Install npm v8.3.0
npm install
npm install -g npm@8.3.0
npm install vue@2.6.14
npm install @vue/cli

# jest - retry often. Don't know how many of those are required :)
npm i -D jest@17.5.1
npm i -D ts-jest@27.1.5
npm i -D @types/jest@27.5.1
npm i -D babel-jest@29.6.2
npm i -D babel-plugin-module-resolver@5.0.0
npm i -D @babel/plugin-proposal-nullish-coalescing-operator@7.18.6
npm i -D @babel/plugin-proposal-optional-chaining@7.21.0
npm i -D google-charts

# npm install vue-template-complier@2.6.14
npm install typeface-roboto

# Run it
npm run serve

# here are the versions of a running system, for reference:
PS C:\code-js\cms-gui> npm list
ms-gui@0.8.4 C:\source\js\js-cms-gui
├── @babel/core@7.22.9
├── @babel/plugin-proposal-nullish-coalescing-operator@7.18.6
├── @babel/plugin-proposal-optional-chaining@7.21.0
├── @babel/preset-env@7.22.9
├── @babel/preset-typescript@7.22.5
├── @fortawesome/fontawesome-svg-core@1.2.36
├── @fortawesome/free-brands-svg-icons@5.15.4
├── @fortawesome/free-regular-svg-icons@5.15.4
├── @fortawesome/free-solid-svg-icons@5.15.4
├── @fortawesome/vue-fontawesome@0.1.10
├── @jest/globals@29.6.2
├── @types/jest@27.5.1
├── @typescript-eslint/eslint-plugin@2.34.0
├── @typescript-eslint/parser@2.34.0
├── @vue/cli-plugin-babel@4.5.15
├── @vue/cli-plugin-eslint@4.5.15
├── @vue/cli-plugin-router@4.5.15
├── @vue/cli-plugin-typescript@4.5.15
├── @vue/cli-service@4.5.15
├── @vue/cli@5.0.8
├── @vue/eslint-config-standard@5.1.2
├── @vue/eslint-config-typescript@5.1.0
├── axios@0.27.2
├── babel-jest@29.6.2
├── babel-plugin-module-resolver@5.0.0
├── bindings@1.5.0 extraneous
├── compression@1.7.4
├── core-js@3.19.1
├── deepmerge@4.2.2
├── eslint-plugin-import@2.25.3
├── eslint-plugin-node@11.1.0
├── eslint-plugin-promise@4.3.1
├── eslint-plugin-standard@4.1.0
├── eslint-plugin-vue@6.2.2
├── eslint@6.8.0
├── fibers@5.0.0
├── file-uri-to-path@1.0.0 extraneous
├── gmap-vue@2.0.2
├── keycloak-js@11.0.3
├── lodash@4.17.21
├── material-design-icons-iconfont@6.7.0
├── nan@2.15.0 extraneous
├── npm@8.3.0
├── sass-loader@8.0.2
├── sass@1.43.4
├── ts-jest@27.1.5
├── typeface-roboto@1.1.13
├── typescript@3.9.10
├── vue-axios@2.1.5
├── vue-class-component@7.2.6
├── vue-cli-plugin-vuetify-preset-basil@1.0.4
├── vue-google-charts@1.1.0
├── vue-i18n@8.26.7
├── vue-json-csv@1.2.12
├── vue-keyframes@1.0.1
├── vue-property-decorator@8.5.1
├── vue-router@3.5.3
├── vue-template-compiler@2.6.14
├── vue@2.6.14
├── vuetify@2.6.0
├── vuex-router-sync@5.0.0
└── vuex@3.6.2
google-charts
```
