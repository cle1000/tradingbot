var _ = require('lodash');
var moment = require('moment');
var randomExt = require('random-ext');

var Bitfinex = require("bitfinex-api-node");

var log = require("../core/log");

var util = require ('../core/util');
var config = util.getConfig();

this.debug = true;

//var util = require(__dirname + '/../util');

class Exchange {
    constructor(candleSize = 5){
        this.name = 'bitfinex';

        _.bindAll(this, ['lessThanMin', 'requestCandles', 'getCandle', 'getCandles', 'checkOrder', 'getSymbols', 'buy', 'sell', 'lessThanMin']);

        let key = config.trader.key;
        let secret = config.trader.secret;

        this.candleSize = candleSize;
        this.bitfinex = new Bitfinex(key, secret, { version: 2 }).rest;
        this.bitfinexV1 = new Bitfinex(key, secret, {version: 1}).rest;
    }

    retry (method, args, name) {
      let wait =+ moment.duration(randomExt.integer(20, 5), 'seconds');
      log.debug(name, `returned an error, retrying in ${wait} ms ...`);

      var self = this;

      // make sure the callback (and any other fn)
      // is bound to Exchange
      _.each(args, (arg, i) => {
        if(_.isFunction(arg))
          args[i] = _.bind(arg, self);
      });

      // run the failed method again with the same
      // arguments after wait
      setTimeout(() => method.apply(self, args), wait );
    }

    getEmptyCandle(time){
        return [time.valueOf(), 0,0,0,0,0]
    }

    addEmptyCandles(candles, start, limit){
        let time = moment(start);
        let modCandles = [];
        let c = candles.shift();
        for (let i = 0; i < limit; i++){
            if (c && moment(c[0]).isSame(time)) {
                modCandles.push(c);
                c = candles.shift();
            }
            else
                modCandles.push(this.getEmptyCandle(time));

            time = time.add(moment.duration(this.candleSize, 'minutes'));
        }
        return modCandles;

    }

    getAssets(pair, callback){
        this.bitfinexV1.wallet_balances((err, res) => {
            if (err){
                return this.retry(this.getAssets, arguments);
            }
            let a = res.find(b => pair.toLowerCase().startsWith(b.currency));
            callback(a.available);
        })
    }

    lastPrice (pair, callback){
        let path = `candles/trade:1h:t${pair}/last`

        this.bitfinex.makePublicRequest(path, (err, candles) => {
            if (err)
                return this.retry(this.lastPrice, arguments, path);
            callback (candles[2])
        })
    }

    requestCandles(pair='BTCUSD', limit=2, start, end, cb){
        start = util.getCleanCandleTime(start, this.candleSize);
        let path = `candles/trade:${this.candleSize}m:t${pair}/hist?limit=${limit}&sort=1`;
        path += start ?  `&start=${start.valueOf()}` : '';
        path += end ?  `&end=${end.valueOf()}` : '';

        log.debug('Querying candles with: ' + path);
        this.bitfinex.makePublicRequest(path, (err, candles) => {
            if (err) {
                //console.log(err);
                return this.retry(this.requestCandles, arguments, path);
            }
            //todo find error code if too much otherwise send error cb(undefined, err)

            cb(this.addEmptyCandles(candles, start, limit).map(c => {
                return {
                    pair: pair,
                    time: c[0],
                    open: c[1],
                    close: c[2],
                    high: c[3],
                    low: c[4],
                    volume: c[5]
                }
            }));
        });
    }


    getCandle(pair, candleTime = util.getLastCandleTime(this.candleSize)){
        let fetchCount = 5;
        let start  = candleTime - moment.duration((fetchCount-2)*this.candleSize, 'minutes');
        return new Promise((resolve, reject) => {
            this.requestCandles(pair, 5, start, undefined, (data, err) => {
                let candle = _.find(data, d => candleTime.isSame(d.time));
                if (candle && err == undefined) return resolve(candle);
                return reject(err || new Error("Candle not found"));
            });
        });
    }

    getCandles(pair, start){
        return new Promise((resolve, reject) => {
            this.requestCandles(pair, 1000, start, undefined, (data, err) => {
                if (err)
                    return reject(err)
                return resolve(data);
            });
        });
    }

    getSymbols(callback){
        callback (null, this.getSym());
        return;
        this.bitfinexV1.symbols_details((err, res) => {
        if (err)
            return this.retry(this.getSymbols, arguments);

        callback(null, res.map(symbol => {
            return {
                currency:  symbol.pair.substring(3,6).toUpperCase(),
                asset:     symbol.pair.substring(0,3).toUpperCase(),
                minimum_order: symbol.minimum_order_size
            }}
        ).sort((a,b) => a.currency.localeCompare(b.currency)).filter(a => a.currency == "USD"))
        });
    }


    buy(assets, price, pair, callback){
        this.submitOrder('buy', assets, price, pair, callback);
    }

    sell(assets, price, pair, callback){
        this.getAssets(pair, (assets) => {
            this.submitOrder('sell', assets, price, pair, callback);
        });
    }

    submitStopLoss (assets, delta, pair, callback){
        this.getAssets(pair, (assets) => {
            let params = {
               nonce: Date.now().toString(),
               symbol: pair,
               amount: (assets).toString(),
               price: delta.toString(),
               exchange: this.name.toLowerCase(),
               side: 'sell',
               type: 'exchange trailing-stop',
               use_all_available: 1,
            };

            this.bitfinexV1.make_request('order/new', params,
                (err, data) => {
                     if (err) {
                         console.log(err);
                        return this.retry(this.submitStopLoss, arguments);
                     }

                  callback(err, data);
                }
            );
        });
    }

    cancel_order(order_id, callback){
         this.bitfinexV1.cancel_order(
            order_id,
            (err, data) => {
                if (err) {
                   log.error('cancel order unable to ' +  err);
                   return this.retry(this.cancel_order, arguments);
                }

              callback(err, data);
            }
        );
    }


    submitOrder(type, assets, price, pair, callback) {
        if (this.debug){
            price = 30000
            if (type == "buy") price = 0.1;
        }

        assets = Math.floor(assets*100000000)/100000000;
        this.bitfinexV1.new_order(
            pair,
            assets + '',
            price + '', //must be pos
            this.name.toLowerCase(),
            type,
            'exchange limit',
            callback
        );
    }

    lessThanMin(asset, pair){
        let symbol = _.find(this.getSym(), s => s.asset + s.currency == pair);
        return (asset  < symbol.minimum_order);
    }

    checkOrder(order_id, callback){
        this.bitfinexV1.order_status(order_id, (err, data) => {
            if (err) {
                log.error(err);
                return this.retry(this.checkOrder, arguments);
            }
            let price = this.debug ? 3 : data.price;
            let assets = this.debug ? Number.parseFloat(data.original_amount) : Number.parseFloat(data.executed_amount);


            callback({
                id: data.id,
                executed: !data.is_live,
                type: data.side,
                assets: assets,
                price: price,
                pair: data.symbol.toUpperCase()
            });
        });

    }

    getSym(){
        return [
	{
		"currency": "USD",
		"asset": "SNT",
		"minimum_order": "38.0"
	},
	{
		"currency": "USD",
		"asset": "GNT",
		"minimum_order": "18.0"
	},
	{
		"currency": "USD",
		"asset": "MNA",
		"minimum_order": "80.0"
	},
	{
		"currency": "USD",
		"asset": "YYW",
		"minimum_order": "48.0"
	},
	{
		"currency": "USD",
		"asset": "QSH",
		"minimum_order": "10.0"
	},
	{
		"currency": "USD",
		"asset": "FUN",
		"minimum_order": "108.0"
	},
	{
		"currency": "USD",
		"asset": "LTC",
		"minimum_order": "0.08"
	},
	{
		"currency": "USD",
		"asset": "DAT",
		"minimum_order": "74.0"
	},
	{
		"currency": "USD",
		"asset": "ZRX",
		"minimum_order": "6.0"
	},
	{
		"currency": "USD",
		"asset": "BTG",
		"minimum_order": "0.06"
	},
	{
		"currency": "USD",
		"asset": "EDO",
		"minimum_order": "4.0"
	},
	{
		"currency": "USD",
		"asset": "TNB",
		"minimum_order": "104.0"
	},
	{
		"currency": "USD",
		"asset": "AVT",
		"minimum_order": "4.0"
	},
	{
		"currency": "USD",
		"asset": "QTM",
		"minimum_order": "0.4"
	},
	{
		"currency": "USD",
		"asset": "SPK",
		"minimum_order": "26.0"
	},
	{
		"currency": "USD",
		"asset": "ETP",
		"minimum_order": "4.0"
	},
	{
		"currency": "USD",
		"asset": "NEO",
		"minimum_order": "0.2"
	},
	{
		"currency": "USD",
		"asset": "TRX",
		"minimum_order": "150.0"
	},
	{
		"currency": "USD",
		"asset": "BAT",
		"minimum_order": "18.0"
	},
	{
		"currency": "USD",
		"asset": "OMG",
		"minimum_order": "1.0"
	},
	{
		"currency": "USD",
		"asset": "RCN",
		"minimum_order": "40.0"
	},
	{
		"currency": "USD",
		"asset": "SAN",
		"minimum_order": "4.0"
	},
	{
		"currency": "USD",
		"asset": "EOS",
		"minimum_order": "2.0"
	},
	{
		"currency": "USD",
		"asset": "RLC",
		"minimum_order": "4.0"
	},
	{
		"currency": "USD",
		"asset": "IOT",
		"minimum_order": "6.0"
	},
	{
		"currency": "USD",
		"asset": "XRP",
		"minimum_order": "10.0"
	},
	{
		"currency": "USD",
		"asset": "AID",
		"minimum_order": "38.0"
	},
	{
		"currency": "USD",
		"asset": "BTC",
		"minimum_order": "0.002"
	},
	{
		"currency": "USD",
		"asset": "DSH",
		"minimum_order": "0.02"
	},
	{
		"currency": "USD",
		"asset": "SNG",
		"minimum_order": "42.0"
	},
	{
		"currency": "USD",
		"asset": "XMR",
		"minimum_order": "0.06"
	},
	{
		"currency": "USD",
		"asset": "ZEC",
		"minimum_order": "0.04"
	},
	{
		"currency": "USD",
		"asset": "REP",
		"minimum_order": "0.2"
	},
	{
		"currency": "USD",
		"asset": "RRT",
		"minimum_order": "86.0"
	},
	{
		"currency": "USD",
		"asset": "ETC",
		"minimum_order": "0.6"
	},
	{
		"currency": "USD",
		"asset": "ELF",
		"minimum_order": "6.0"
	},
	{
		"currency": "USD",
		"asset": "ETH",
		"minimum_order": "0.02"
	},
	{
		"currency": "USD",
		"asset": "BCH",
		"minimum_order": "0.006"
	}
];


    }

    getOrders (callback){
        this.bitfinexV1.active_orders((err, res) => {
            if (err){
                return this.retry(this.getOrders, arguments);
            }

            callback(res.map(r => {
                return {
                    id: r.id,
                    type: r.side,
                    pair: r.symbol.toUpperCase(),
                    market: r.type
                }
            }));
        });
    }

    getBalances(callback){
        this.bitfinexV1.wallet_balances((err, res) => {
            if (err)
                return this.retry(this.getBalances, arguments);

            let balances = res
                .map(r => {return {
                    'name': r.currency.toUpperCase(),
                    'available' : Number.parseFloat(r.available),
                    'amount' : Number.parseFloat(r.amount)}})
                .filter(b => b.amount != 0 && b.amount > 0.0000001);

            let priceRequests = balances.filter(b => b.name != 'USD')
                .map(b => new Promise((resolve, reject) => {
                    this.lastPrice(b.name+"USD", price => resolve({ 'name' : b.name, price}));
                }
            ));

            Promise.all(priceRequests).then((prices) => {
                let balancesWithPrice = balances.map(b => {
                        if (b.name != 'USD') {
                            let e = prices.find(p => p.name == b.name);
                            b.price = e.price;
                            b.estimatedCurrency = b.price * b.amount;
                        }else
                            b.estimatedCurrency = b.amount;
                        return b;
                    });
                let indexCurrency = balancesWithPrice.findIndex(b => b.name == "USD");
                balancesWithPrice[indexCurrency].amount = _.sum(balancesWithPrice.map(b => b.estimatedCurrency));
                balancesWithPrice[indexCurrency].estimatedCurrency = undefined;

                callback (
                    balancesWithPrice
                )
            }).catch((err) => console.log(err));
        } );
    }

    getAccountInfo(callback){

        this.bitfinexV1.account_infos((err, res) => {
            if (err)
                return this.retry(this.getAccountInfo, arguments);

            console.log(JSON.stringify(res));
        } );
    }

}

module.exports = new Exchange();

/*

new Exchange().requestCandles('BT1USD', 1000, moment().subtract(moment.duration(6, "hours")), undefined, (data, err) => {
    data.map(c => console.log(moment(c.time).format() + " " + c.volume));
});
*/
//new Exchange().getBalances((data) => console.log(data));