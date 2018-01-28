var moment = require('moment');
var _ = require('lodash');
var fs = require('file-system');

var util = {
    getLastCandleTime: (candleSize) => {
        let now = moment().valueOf();
        let rest = now % moment.duration(candleSize, 'minutes');
        return moment(now - rest - moment.duration(candleSize, 'minutes'));
    },
    getCleanCandleTime: (time, candleSize) => {
        time = moment(time).valueOf();
        let rest = time % moment.duration(candleSize, 'minutes');
        return moment(time - rest);
    },
    getTimeForNextCandle(candleSize){
         let timeToStart = util.getLastCandleTime(candleSize)
            .add(moment.duration(candleSize*2, 'minutes'))
            .add(moment.duration(1, 'secound'));
         return timeToStart.valueOf() - moment().valueOf()

    },

    isBetween(x, a, b){
        let max = _.max([a,b]);
        let min = _.min([a,b]);
        return (x >= min && x < max)
    },
    substractArray(xs,ys, k){
        let result = [];
        _.each(xs, x => {
            if (-1 ==_.findIndex(ys, (y) => y[k] == x[k])){
                result.push(x);
            }
        });
        return result;
    },
    getMinToWait(min){
        return min*60*1000;
    },
    isCustomCandleTick(customCandleSize,candleSize, tick){
        return (tick % (customCandleSize/candleSize)) == 0;
    },
    clone(obj){
        return Object.create(obj);
    },
    dirs: () => {
        var ROOT = __dirname + '/../';

        return {
          home: ROOT,
          core: ROOT + 'core/',
          exchanges: ROOT + 'exchanges/',
          markets: ROOT + 'core/marktes/',
        }
    },
    getConfig: function() {
        if(!fs.existsSync(`${util.dirs().home}config.js`))
          util.die('Cannot find the specified config file.');
        let _config = require(`${util.dirs().home}config.js`);
        return _config;
    },
    stop: () => process.exit(1),
    die: (m) => {
        console.trace();
        console.error('\n\nTradebot encountered an error and can\'t continue');
        console.error('\nError:\n');
        console.error(m, '\n\n');
        process.exit(1);
      }
}

module.exports = util;