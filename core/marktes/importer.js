var moment = require("moment");
var _ = require("lodash");
var util = require ('../util');
var config = util.getConfig();
var log =  require('../log');

const EventEmitter = require('events');

var CandleFetcher = require('../candleFetcher');

class Importer extends EventEmitter {

    constructor(pairs) {
        super();

        let getCandles = require(`${util.dirs().exchanges}/bitfinex.js`).getCandles;
        this.candleFetcher = new CandleFetcher(pairs, getCandles);

        this.candleFetcher.on('done', () => this.emit('done'));
        this.candleFetcher.on('processCandle', (candle, next) => this.emit('processCandle', candle, next));
    }


    get() {
        this.candleFetcher.get();
    }
}

module.exports = Importer;

//new Importer(['BTCUSD', 'ETHUSD', "ETCUSD"]).getCandles(()=> console.log('done'));