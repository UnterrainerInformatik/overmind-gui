// Runtime configuration, loaded by index.html before the app.
// Production overwrites this file on container start from deploy/overmind-config.js.template;
// never commit a token here - the repo and the Docker image are public.
window.overmindConfig = {
  musicAssistant: {
    url: 'https://music.unterrainer.info',
    token: ''
  }
}
