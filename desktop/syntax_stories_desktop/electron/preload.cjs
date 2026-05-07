const { contextBridge } = require('electron');

/** Reserved for future safe IPC (e.g. secure token storage). Renderer uses fetch to the API. */
contextBridge.exposeInMainWorld('syntaxStoriesDesktop', {
  platform: process.platform,
});
