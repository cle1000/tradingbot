var moment = require("moment");
var _ = require("lodash");
var util = require ('../util');
var config = util.getConfig();
var log =  require('../log');
var sleep = require('sleep');
const EventEmitter = require('events');

var Strategy = util.getConfig().mode == "realtime" ? require ('./realtimeStrategy') : require("./backtestStrategy")

class StrategyManager extends EventEmitter{

    constructor(pairs){
        super();
        this.markets = pairs.map(pair => {
            let strategy = new Strategy(pair);
            return {pair, strategy};
        });
        this.reportCounter = 0;
        this.lastCandleTime = moment();
    }

    getMarket(pair, markets){
        return _.find(markets, m => m.pair == pair);
    }


    processCandle(candle, done){
        //process candles always on market
        candle.map(c => {
            this.lastCandleTime = moment(c.time);
            this.getMarket(c.pair, this.markets).strategy.processCandle(c);
        });
        let cct = false;

        if (util.isCustomCandleTick(config.customCandleSize, config.candleSize, this.reportCounter)){
            cct = true;
        }

        if (this.reportCounter/(config.customCandleSize/config.candleSize) < config.historySize ||
            (config.mode == 'realtime' && moment(this.lastCandleTime).isBefore(util.getLastCandleTime(config.candleSize)))
        ) {
            done();
        }else {
            this.emit('report',
                this.markets.map(m => {
                    return {
                        'pair': m.pair,
                        'advice': m.strategy.advice.type,
                        'result': m.strategy.advice.result,
                        'price': m.strategy.advice.price,
                    }
                }), this.lastCandleTime, done, cct);
        }
        this.reportCounter++;
    }
}

module.exports = StrategyManager;


