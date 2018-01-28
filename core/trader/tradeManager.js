var util = require ('../util');
var config = util.getConfig();
var moment = require('moment');
var _ = require('lodash');
var tradePrinter = require ('./tradePrinter');
var log = require('../log');
const JsonWriter = require('../jsonWriter');

class TradeManager{
    constructor(){
        _.bindAll(this, ['processReports', 'bought', 'sold', 'abortTrade', 'setOpenTrades']);

        var Trader = config.trader.real && config.mode == "realtime" ? require(`./realTrader`) : require(`./paperTrader`);
        this.trader = new Trader();

        this.trader.on("abortTrade", this.abortTrade);
        this.trader.on("bought", this.bought);
        this.trader.on("sold", this.sold)

        this.trader.on("openTrades", this.setOpenTrades);

        this.ticks = 0;

        this.openTrades = [];
        this.toBuy = [];
        this.toSell = [];
        this.trades = [];
        this.abort = 0;
        this.lastReports = undefined;
        this.jsonWriter = new JsonWriter('report.txt');
    }

    setOpenTrades(balances) {
        this.openTrades = balances.map(b =>{
            return {
                pair: `${b.name}USD`,
                status: "bought",
                bought: {
                    time: this.time,
                    price: b.price,
                    amount: b.amount * b.price, //balances are for all currencies therefore amount = asset
                    assets: b.amount,
                    high: b.price

                }
            }
        });
        console.log("tradeManager init");
    }


    processReports(reports, time, done, cct) {
        //log.info(".");
        this.jsonWriter.write(reports);
        this.lastReports = reports;

        if (cct) {

            this.toBuy = this.pairsToBuy(reports);

            this.toSell = this.pairsToSell(reports, this.toBuy.length > 2);
        }
        // console.log('.');
        // if (this.toBuy.length > 0 || this.toSell.length > 0){
        //     console.log('-');
        // }
        // if (this.toBuy.length > 1){
        //     console.log(this.toBuy);
        // }
        //  if (this.toSell.length > 0){
        //     console.log(this.toSell);
        // }


        this.time = time;
        this.tradeDone = function () {

            done();
        };




        if (cct) {
            if (config.mode == "realtime" || (config.mode == "backtest" && config.debug)) {
                log.info(`Time: ${moment(time).format()} \nDollars: ${this.trader.currency}\nCurrentTrades: ${this.trader.currentTrades}`
                    + `\nTo Buy: ${this.toBuy.map(b => `${b.pair} [${JSON.stringify(b.result)}]`)}`
                    + `\nTo Sell: ${this.toSell.map(b => b.pair)}\n`
                );


            this.printOpenTrades(this.openTrades.filter(ot => ot.status == "bought"), reports, time);
            }
            //try to sell all

            this.sell(this.toSell, time);
            if (this.toSell.length === 0) {
                this.startBuying();
            }
        } else{done();}  //if sell is done call start buying
    }


    startBuying(){
        this.buy(this.toBuy, this.time);
        this.toBuy = [];
    }


    pairsToBuy(reports){
        let adviceToBuy = this.filterReports(reports, 'buy');
        // remove all which are in open trades
        adviceToBuy = _.filter(adviceToBuy, b => _.findIndex(this.openTrades, ot => ot.pair === b.pair) === -1 );

        return _.reverse(_.sortBy(adviceToBuy, ['result.ppo',  'result.movement', 'result.bb',  'result.duration']));
    }


    pairsToSell(reports, buyIsPossible){
        let openTradesForSell = this.openTrades.filter (ot => ot.status == 'bought');


        let advicedToSell = _.intersectionBy(this.filterReports(reports, 'sell'), openTradesForSell, 'pair');
        let canBeSold = [];

        if (buyIsPossible)
            canBeSold = _.intersectionBy(reports.filter(r => r.advice == 'sellif'), openTradesForSell, 'pair');


        let toSell = _.unionBy(advicedToSell, canBeSold, 'pair');

        return toSell;
    }


    buy(toBuy){
        _.each(toBuy, b => {
            this.openTrades.push({
                pair: b.pair,
                status: 'buying'
            });
            this.trader.buy(b.pair, b.price);
        });
        if (toBuy.length == 0) this.tradeDone();
    }

    sell(toSell){
        _.each(toSell, s => {
            this.updateOpenTrades(s.pair, 'selling');
            let ot = this.getOpenTrade(s.pair);
            this.trader.sell(s.pair, s.price, ot.bought.assets);
        });
    }

    //callbacks
    bought(pair, price, amount, assets){
        this.updateOpenTrades(pair, 'bought', 'bought', {time: this.time, price, amount, assets, high: price});
        if (this.buyingDone())  this.tradeDone();
    }

    sold (pair, price, amount){
        let trade = this.getOpenTrade(pair);
        this.removeOpenTrade(pair);
        if (trade) {
            trade.sold = {
                time: this.time,
                price: price,
                amount: amount
            };
            trade.status = 'done';

            this.trades.push(trade);
            tradePrinter.printTrade(trade);
        }else{
            log.error('sold triggered but no open trade found');
        }
        if (this.sellingDone()) this.startBuying();
    }

    abortTrade(type, pair){
        if (type == "buy"){
            this.abortBuying(pair);
        }else{
            this.abortSelling(pair);
        }
    }

    abortBuying(pair){
        this.abort ++;
        this.removeOpenTrade(pair);
        if (this.buyingDone())
            this.tradeDone();
    }

    sellingDone(){
       return (this.openTrades.find(ot => ot.status == 'selling') == undefined);
    }

    buyingDone(){
       return (this.openTrades.find(ot => ot.status == 'buying') == undefined);
    }

    percentPerformanceOT(ot, price){
        return (price/ot.bought.price * 100) - 100;
    }

    abortSelling(pair){
        this.removeOpenTrade(pair);
        if (this.sellingDone()) this.startBuying();
    }

    //callbacks end

    updateOpenTrades(pair, status, key, value){
        this.openTrades = this.openTrades.map(ot => {
               if (ot.pair === pair){
                  ot.status = status;
                  if (key)
                    ot[key] = value;
               }
               return ot;
            });
    }

    getOpenTrade(pair){
        return this.openTrades.find(ot => ot.pair === pair);
    }

    removeOpenTrade(pair){
        this.openTrades = _.filter(this.openTrades, ot => ot.pair != pair);
    }

    filterReports(reports, type){
        return reports.filter(r => r.advice == type);
    }

    getReport(reports, pair){
        return reports.find(r => r.pair == pair);
    }

    printOpenTrades(openTrades, reports, time){
        if (openTrades.length > 0) {
            log.info ("###############################################")
            log.info(`Currents Trades [${moment(time).format()}]: `);
            log.info(`Currency:  ${this.trader.currency}`);

            openTrades.map(ot => {
                let currentPrice = _.find(reports, r => r.pair == ot.pair).price;
                tradePrinter.printOpenTrade(ot, currentPrice);
            });
            log.info('################################################\n');
        }
    }

    done(){
        this.startBuying = () => {
            log.info("Trade manager done print report");
            log.info(`${config.backtest.daterange.from} -- ${config.backtest.daterange.to}`);
            log.info(this.trader.currency.toFixed(2)+'%');
            log.info("Aborts: " + this.abort);
        };
        this.sellAll(this.lastReports);
    }

    sellAll(reports){
       let openTradesForSell = this.openTrades.filter (ot => ot.status == 'bought');
       let toSell =  _.intersectionBy(reports, openTradesForSell, 'pair');
       this.sell(toSell, moment());
    }
}

module.exports = TradeManager;