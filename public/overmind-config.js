// Runtime configuration, loaded by index.html before the app.
// Production replaces this file with a volume mount that carries the real token;
// never commit a token here - the repo and the Docker image are public.
window.overmindConfig = {
  musicAssistant: {
    url: 'https://music.unterrainer.info',
    token: ''
  }
}
