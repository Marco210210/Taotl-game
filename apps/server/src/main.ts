import { createApp } from './app';
import { loadConfig } from './config';

const cfg = loadConfig();
const { httpServer } = createApp(cfg);
httpServer.listen(cfg.port, () => {
  console.log(`listening on ${cfg.port}`);
});
