var util = require ('../util');
var config = util.getConfig();
var moment = require('moment');
var _ = require('lodash');
var EventEmitter = require('events');


/*
events:
emit: tradeSuccessful
emit: tradeAbort
 */

class PaperTrader extends EventEmitter{
    constructor(){
        super();
        _.bindAll(this, ['buy', 'sell']);
        this.parallelTrades = config.trader.parallelTrades;
        this.currentTrades = 0;
        this.currency = 100;
    }

    myEmit (){
        process.nextTick(() => this.emit.apply(this,_.toArray(arguments)));
    }

     getAmountOfCurrency () {
        let freeTrades = this.parallelTrades - this.currentTrades;
        let value = this.currency/freeTrades;
        return value;
    }


    buy (pair, price){
        if (this.currentTrades >= this.parallelTrades){
             this.myEmit("abortTrade",'buy', pair);
             return;
        }


        let amount = this.getAmountOfCurrency();
        let assets = amount/price;

        this.currentTrades++;
        this.currency -= amount;
        this.myEmit("bought", pair, price, amount, assets);
    }

    sell(pair, price, assets){
        this.currentTrades--;

        let retailPrice = assets * price;

        this.currency += retailPrice;
        this.myEmit("sold", pair, price, retailPrice);
    }

}

module.exports = PaperTrader;