var moment = require("moment");
var _ = require("lodash");
var util = require ('./util');
var config = util.getConfig();
var log =  require('./log');

const EventEmitter = require('events');

class CandleBatcher extends EventEmitter {

    constructor(processCustomCandle) {
        super();
        let customCandleSize = config.customCandleSize;
        let candleSize = config.candleSize;

        this.processCustomCandle = processCustomCandle;

        if (customCandleSize % candleSize != 0 ){
            util.die("CustomCandleSize is not a multiple of candle size")
        }

        this.count = customCandleSize / candleSize;
        this.smallCandles = [];
    }

    add(candle){
        this.smallCandles.push(candle);
        this.check();
    }

    check(){
        if(_.size(this.smallCandles) % this.count !== 0)
            return;

       // this.emit('candle', this.calculate());
        this.processCustomCandle(this.calculate());
        this.smallCandles = [];
    }

    calculate () {
        let cs = this.smallCandles;

        let candle = {
            time:   _.first(cs).time,
            open: _.find(cs.map(c => c.open), o => o != 0) || 0,
            close: _.findLast(cs.map(c => c.close), c => c != 0) || 0,
            high: _.max(cs.map(c => c.high)),
            low: _.min(cs.filter(c => c.low !=0).map(c => c.low)) || 0,
            volume: _.sum(cs.map(c => c.volume))
        };

        return candle;
    }
}

module.exports = CandleBatcher;
