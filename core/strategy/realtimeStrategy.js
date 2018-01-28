var log = require('../log');
var util = require('../util');
var config = util.getConfig();
var sleep = require('sleep');
var _ = require('lodash');

var Strategy = require('./baseStrategy')

var CandleBatcher = require('../candleBatcher');

var BB = require('./indicators/BB');


class ownStrategy extends Strategy{
    constructor(pair){
        super();
        _.bindAll(this, ['processCustomCandle', 'processCandle']);
        this.ticks = 0;
        this.pair = pair;

        this.candleBatcher = new CandleBatcher(this.processCustomCandle);

        this.settings = config.strategy;

        this.historySize = config.historySize;
        this.addIndicator('bb', 'BB', this.settings.bb);
        this.addIndicator('ppo', 'PPO', this.settings.ppo);
        this.addIndicator('volume', 'VOLUME', this.settings.volume);
        this.addIndicator('rsi', 'RSI', this.settings.rsi);

        this.lastPrice = 0;
        this.data = {
            ppo: {
                direction: 'none',
                duration: 0,
                result: 0,
                persisted: false,
                move: 'none'
            },
            rsi: {
                overbought: false,
                oversold: false,
            },
            bb : {
                sell: false,
                buy: false
            },
            adviced : undefined,
        };
         this.advice = {
             type: 'nothing',
             result: {},
             price: 0
        }
    }

    processCandle (candle){
        if (candle.close !=  0) this.tempPriceLast = candle.close;

        this.advice.price = (candle.close == 0) ? this.tempPriceLast : candle.close;
        this.candleBatcher.add(candle);
    }

    processCustomCandle(candle){
       // console.log(candle);
        this.ticks ++;
        if (candle.close !=  0) this.lastPrice = candle.close;
        candle.close = (candle.close == 0) ? this.lastPrice : candle.close;

        this.updateIndicators(candle);

        this.processRSI(candle);
        this.processPPO(candle);
        this.processBB(candle);



        let type = 'nothing';

        // if volume == false too less trades or volume to use it
        if (this.indicators.volume.result){
            if (this.data.ppo.advice == 'buy'){
                type = 'buy';
            } else if (this.data.ppo.advice == 'sell' || this.data.bb.sell){
                 type = 'sell'
            }
        } else{
            this.type = 'sell'
        }
        this.triggerAdvice(type, {
                ppo: this.data.ppo.result.toFixed(3),
                duration: this.data.ppo.duration,
                movement: this.data.ppo.movement,
                bb: this.data.bb.result,
            }, candle.close)
    }

    triggerAdvice(type, result, price){
        if (this.historySize > this.ticks){
            return;
        }

        this.advice = {
            type, result, price
        }
    }

    processPPO(candle) {
        let result = this.indicators.ppo.result.PPOhist;
        let lastResult = this.data.ppo.result;
        this.data.ppo.advice = 'none';

            if (result > this.settings.ppo.up) {
                if (this.data.ppo.direction !== 'up')
                    this.data.ppo = {
                        duration: 0,
                        persisted: false,
                        direction: 'up',
                        move: 'up',
                        constantUp: true,
                        advice: 'buy',
                        result: this.data.ppo.result
                    };
                this.data.ppo.duration++;
                if (this.data.ppo.duration >= this.settings.ppo.persistenceUp)
                    this.data.ppo.persisted = true;

            } else if (result < this.settings.ppo.down) {
                if (this.data.ppo.direction !== 'down')
                // reset the ducks for the new trend
                    this.data.ppo = {
                        duration: 0,
                        persisted: false,
                        direction: 'down',
                        move: 'down',
                        result: this.data.ppo.result
                    };
                this.data.ppo.duration++;
                if (this.data.ppo.duration >= this.settings.ppo.persistenceDown)
                    this.data.ppo.persisted = true;
                this.data.ppo.advice = 'sell';
            }


            this.data.ppo.movement = (result - lastResult);


            // if (this.data.ppo.movement < 0)
            //      this.data.ppo.constantUp = false;
            // if (this.data.ppo.constantUp)
            //     this.data.ppo.advice = 'buy'


            // if (this.data.ppo.movement > 0 && this.data.ppo.direction == 'up' && this.data.ppo.move == 'up')
            //     this.data.ppo.advice = "buy";

        this.data.ppo.result = result;
    }


    processBB (candle){
        let result = this.indicators.bb.result;

        if (result > 1) {
            this.data.bb = {
                buy: true,
                sell: false
            }
        }
        else if (result < 0){
            this.data.bb = {
                buy: false,
                sell: true
            }
        }else {
            this.data.bb = {
                buy: false,
                sell: false
            }
        }
        this.data.bb.result = result;
        this.data.bb.movement = this.indicators.bb.movement;
    }

    processRSI (candle){

        let result = this.indicators.rsi.result;

        let overbought = result > this.settings.rsi.high;
        let oversold = result < this.settings.rsi.low;

        if (!overbought && this.data.rsi.overbought)
            this.data.rsi.sell = true;
        else if (!oversold && this.data.rsi.oversold)
            this.data.rsi.buy = true;
        else {
            this.data.rsi.overbought = overbought;
            this.data.rsi.oversold = oversold;
        }
    }
}

module.exports = ownStrategy;
