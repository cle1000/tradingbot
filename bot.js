var moment = require("moment");
var _ = require("lodash");
var util = require ('./core/util');
var config = util.getConfig();
var log =  require('./core/log');
var sleep = require('sleep');
var StrategyManager = require('./core/strategy/strategyManager');
var TradeManager = require('./core/trader/tradeManager');

var CandleWriter = require("./database/writer.js");


class Bot {
    constructor(){
        _.bindAll(this);

        this.processCandle = this.processCandle.bind(this);
        this.done = this.done.bind(this);

        let exchange = require(`${util.dirs().exchanges}/bitfinex.js`);
        exchange.getSymbols((err, symbols) => this.start(symbols));
    }

    start(symbols){
        log.info(JSON.stringify(symbols, null, '\t'));
        this.pairs = symbols.map(s => s.asset+s.currency);

        var Market = require(util.dirs().markets + config.mode);

        this.tradeManager = new TradeManager();

        this.market = new Market(this.pairs);

        this.market.on('processCandle', this.processCandle);
        this.market.on('done', this.done);


        this.strategyManager = new StrategyManager(this.pairs);
        this.strategyManager.on("report", this.tradeManager.processReports);

        if (config.mode == 'importer') {
            this.candleWriter = new CandleWriter();
        }
        this.market.get();
    }

    processCandle(candle, next){
        if (config.mode == 'importer')
            this.candleWriter.addCandles(candle);


        this.strategyManager.processCandle(candle, () => process.nextTick(next));

    }

    done(){
        if (config.mode == 'importer'){
            this.candleWriter.finalize();
        }
        this.tradeManager.done();
        log.info("done");
    }
}

new Bot();


