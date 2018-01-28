var moment = require("moment");
var _ = require("lodash");
var util = require ('../util');
var config = util.getConfig();
var log =  require('../log');

const EventEmitter = require('events');

var CandleProvider = require('../candleProvider');
var Heart = require('../heart');

class Realtime extends EventEmitter {

    constructor(pairs) {
        super();
        this.pairs = pairs;
        this.candleSize = 5;

        this.tick = this.tick.bind(this);

        this.heart = new Heart();
        this.heart.on('tick', this.tick);

        this.candleProvider = new CandleProvider(this.pairs);
        this.candleProvider.on("processCandle",  (candle, next) => this.emit('processCandle', candle, next));
        this.candleProvider.on("prefetchDone",  (lastCandleTime) => this.prefetchDone(lastCandleTime));
    }

    get(){
        let msToStart = util.getTimeForNextCandle(this.candleSize);
        //todo: remove 2000
        //msToStart = 2000;
        log.info(`Start with prefetch in ${msToStart/1000}s`);
        setTimeout(this.candleProvider.prefetch, msToStart);
    }

    prefetchDone(lastPrefetchCandleTime){
        log.info("Prefetch Done\n");
        let timeForFirstPump = util.getTimeForNextCandle(this.candleSize);
        log.info(`Start with realtime data in ${timeForFirstPump/1000}s`);
        setTimeout(this.heart.pump, timeForFirstPump);
    }


    tick(){
        log.debug("tick");
        this.candleProvider.fetchCandle();
    }
}

module.exports = Realtime;
