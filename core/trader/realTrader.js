var util = require ('../util');
var config = util.getConfig();
var moment = require('moment');
var log = require('../log');
var _ = require('lodash');
var EventEmitter = require('events');
var sleep = require('sleep');


/*
events:
emit: tradeSuccessful
emit: tradeAbort
emit: setOpenTrades
emit("sold", pair, price, retailPrice);
emit("bought", pair, price, amount, assets);
 */

class RealTrader extends EventEmitter{
    constructor(){
        super();
        _.bindAll(this, ['buy', 'sell', 'initPortfolio', 'updateUSD', 'checkOrders', 'myEmit', 'processSold', 'watchBuy', 'updateSellOrderIds' ]);

        this.exchange = require('../../exchanges/bitfinex');

        this.parallelTrades = config.trader.parallelTrades;
        this.currentTrades = 0;
        this.currency = 0;
        this.estimatedCurrency = 0;

        this.exchange.getBalances(this.initPortfolio);
        this.exchange.getOrders(this.updateSellOrderIds);

        this.sellOrders = [];

        //change min to sec

        setInterval(this.checkOrders, util.getMinToWait(1));

    }

    updateSellOrderIds(orders){
        orders.map(o => this.addSellOrder(o.id, o.pair, o.type, o.market));
        console.log("sell orders initialized")
    }

    addSellOrder(id, pair, type, market){
        this.sellOrders.push({
            id, pair, type, market
        });
    }

    initPortfolio(balances){
        this.updateUSD(balances);
        this.currentTrades = balances.length;
        this.emit("openTrades", balances);
    }

    updateUSD(balances){
        let usd = (_.remove(balances, b => b.name == "USD"))[0];
        this.currency = usd ? usd.available : 0;
        this.estimatedCurrency = usd.amount;
    }

    myEmit (){
        process.nextTick(() => this.emit.apply(this,_.toArray(arguments)));
    }

    getAmountOfCurrency () {
        let value = (this.estimatedCurrency*(config.trader.percentToInvest/100))/this.parallelTrades;
        return value;
    }

    startTrade(amount){
        this.currency -= amount;
        this.currentTrades++;
    }

    stopTrade(amount, update){
        this.currentTrades--;
        this.currency += amount;
        if (update)
            this.exchange.getBalances(this.updateUSD);
    }

    buy (pair, price){
        if (this.currentTrades >= this.parallelTrades){
            log.info(`Trade buy ${pair} abort no free slot available`);
             return this.myEmit("abortTrade",'buy', pair);
        }

        let amount = this.getAmountOfCurrency();
        let assets = amount/price;

        if (this.exchange.lessThanMin(assets, pair)){
            log.info(`Cannot buy ${assets} ${pair} for ${amount}$`);
            return this.myEmit("abortTrade",'buy', pair);
        }
        //trade will be processed

        this.startTrade(amount);

        log.info(`Start buying ${pair} at price: ${price}`);

        this.exchange.buy(assets, price, pair, (err, data) => {
             if (err){
                this.stopTrade(amount);
                log.info(`Buy ${pair} was abort by exchange service`);
                log.error(err);
                return this.myEmit("abortTrade",'buy', pair);
             }

             this.watchBuy(data.order_id, pair, amount, 5);
        });
    };


    watchBuy(order_id, pair, amount, ticks){
        this.exchange.checkOrder(order_id, order => {
            if (order.executed){
                let purchasePrice = order.price * order.assets;
                this.emit("bought", pair, order.price, purchasePrice, order.assets);
                log.info(`Bought ${pair} for price: ${order.price}`);
                this.setTrailingSellOrder(pair, order.price, order.assets);
            }else{
                if (ticks == 0){
                  this.exchange.cancel_order(order_id, (err, data) => {
                      log.info(`Buy ${pair} was canceled: limit order not fullfilled`);
                      this.stopTrade(amount);
                  });
                }else {
                    log.info(`Wait 10 sec to check buy order again...`);
                    setTimeout(() => this.watchBuy(order_id, pair, amount, ticks--), 10 * 1000);
                }
            }
        });
    }

    setTrailingSellOrder(pair, price, assets, deltaPercent) {
        if (deltaPercent == undefined)
            deltaPercent = config.trader.stopLossPercent;

        let deltaToSell = (price/100)*deltaPercent;
        this.exchange.submitStopLoss(assets, deltaToSell, pair, (err, data) => {
                if (err){
                    log.error(err);
                    log.info("error at setting stop loss");
                }else {
                    //this.addSellOrder(data.order_id, pair, 'sell', 'exchange trailing stop');
                }
        });

    }


    sell(pair, price, assets){
        log.info(`Start selling ${pair} at a price of ${price}...`);
        let openOrder = this.getSellOrder(pair);
        this.removeOrder(openOrder);

        if (openOrder){
            this.exchange.cancel_order(openOrder.id, (err, data) => {
                if (err){
                    log.error(err); log.info(data);
                    log.info(`Try to cancel order for pair ${pair} but got error `);
                }else {
                    log.info('Trailing stop order canceled');

                    sleep.msleep(10000);
                    this.sell(pair, price, assets); // call sell again
                }
            });
        }else{
             this.exchange.sell(assets, price, pair, (err, data) => {
                if (err){
                    log.error(err);
                    log.info("error at sell");
                }else
                    this.addSellOrder(data.order_id, pair, 'sell', 'limit');
                });
        }



        // hit to sell update trailing stop for delta 1%
        //remove cancle current order
        //wait for cancle
        //try to update new trailng stop
        //util.die('not implemented')
        // this.exchange.sell(assets, pair, (err, data) => {
        //     if (err){
        //         return this.myEmit("abortTrade",'sell', pair);
        //     }
        //     process.nextTick(this.checkOrders);
        // });
    }

    checkOrders(){
        if (this.sellOrders.length > 0){
            log.debug("Check sellOrders:");
        }
        this.sellOrders.map(o => {
            this.exchange.checkOrder(o.id, (order) => {
                if (order.executed) {
                    if (order.type == "sell")
                        this.processSold(order);
                    else
                        this.processBought(order);
                }
            });
        });
    }

    removeOrder(order){
        if (order)
            this.sellOrders = this.sellOrders.filter(o => o.id != order.id);
    }

    getSellOrder(pair){
        return _.find(this.sellOrders, o => o.pair == pair);
    }

    processSold(order){
        this.removeOrder(order);
        let retailPrice =  order.assets * order.price;
        this.stopTrade(retailPrice);

        log.info(`Sold ${order.assets} ${order.pair} for ${order.price}$ `);
        this.emit("sold", order.pair, order.price, retailPrice);
    }
}

module.exports = RealTrader;

//let rt = new RealTrader();
//setTimeout(() => rt.sell("SPKUSD", 0.60, 95.64960734), 5000);