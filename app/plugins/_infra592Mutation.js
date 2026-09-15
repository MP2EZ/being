// INFRA-592 mutation probe (PR #510 ubuntu proof) — THROWAWAY, reverted before merge.
const fs = require('fs');
const { withFinalizedMod, IOSConfig } = require('expo/config-plugins');
const plist = require('@expo/plist').default;
const MODE = 'throw';
module.exports = (config) =>
  withFinalizedMod(config, ['ios', async (cfg) => {
    if (MODE === 'throw') throw new Error('INFRA-592 mutation: plugin throws');
    const file = IOSConfig.Paths.getInfoPlistPath(cfg.modRequest.projectRoot);
    const data = plist.parse(fs.readFileSync(file, 'utf8'));
    const s = data.LSApplicationQueriesSchemes;
    data.LSApplicationQueriesSchemes = MODE === 'telprompt' ? s.map((x) => (x === 'tel' ? 'telprompt' : x)) : s.filter((x) => x !== 'sms');
    fs.writeFileSync(file, plist.build(data));
    return cfg;
  }]);
