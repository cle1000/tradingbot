var moment = require("moment");
var _ = require("lodash");
var util = require ('../util');
var config = util.getConfig();
var log =  require('../log');

var CandleReader = require('../../database/reader');
var CandleFetcher = require('../candleFetcher');

const EventEmitter = require('events');

class Backtest extends EventEmitter {

    constructor(pairs) {
        super();
        let getCandles =  new CandleReader().getCandles;
        this.candleFetcher = new CandleFetcher(pairs, getCandles, config.backtest.daterange);

        this.candleFetcher.on('done', () => this.emit('done'));
        this.candleFetcher.on('processCandle', (candle, next) => this.emit('processCandle', candle, next));
    }


    get() {
        this.candleFetcher.get();
    }
}

module.exports = Backtest;

//new Importer(['BTCUSD', 'ETHUSD', "ETCUSD"]).getCandles(()=> console.log('done'));