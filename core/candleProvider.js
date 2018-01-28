var moment = require("moment");
var _ = require("lodash");
var util = require ('./util');
var config = util.getConfig();
var log =  require('./log');
var CandleFetcher = require('./candleFetcher');
const EventEmitter = require('events');

class CandleProvider extends EventEmitter {

    constructor(pairs) {
        super();
        this.pairs = pairs;
        this.exchange = require(`${util.dirs().exchanges}/bitfinex.js`);

        let historySize = config.historySize;
        let candleSize = config.candleSize;
        let customCandleSize = config.customCandleSize;

        let start = this.getPrefetchTime(historySize, candleSize, customCandleSize);

        this.candleFetcher = new CandleFetcher(this.pairs, this.exchange.getCandles, {from: start, to: util.getLastCandleTime(candleSize)});
        this.candleFetcher.on('done', (lastCandleTime) => this.emit('prefetchDone', lastCandleTime));
        this.candleFetcher.on('processCandle', (candle, next) => this.emit('processCandle', candle, next));

        this.prefetch = this.prefetch.bind(this);
        this.fetchCandle = this.fetchCandle.bind(this);

    }

    getPrefetchTime(historySize, candleSize, customCandleSize){
        return util.getLastCandleTime(candleSize).valueOf() - moment.duration(((historySize+1)*(customCandleSize))+1, 'minutes');
    }

    prefetch(){
        this.candleFetcher.get();
    }

    fetchCandle(time){
        Promise.all(this.pairs.map((p) => this.exchange.getCandle(p, time)))
            .then(candle => this.handleFetchCandle(candle))
            .catch((err) => console.log(err));
    }

    handleFetchCandle(candle){
        this.emit('processCandle', candle, () => {});
    }
}

module.exports = CandleProvider;
