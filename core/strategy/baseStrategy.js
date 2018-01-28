var log = require('../log');
var util = require('../util');
var config = util.getConfig();
var _ = require('lodash');
var BB = require('./indicators/BB');


class Strategy{
    constructor(pair){
        this.indicators = {};
        this.names = [];
        this.pair = pair;
        this.ticks = 0;
    }

    addIndicator(name, type, settings){
        let Indicator = require(`./indicators/${type}`);
        this.names.push(name);
        this.indicators[name] = new Indicator(settings, this.pair);
    }

    updateIndicators(candle){
        this.ticks ++;
        _.mapValues(this.indicators, i=> {
            if (i.input == 'candle'){
                i.update(candle);
            }else {
                i.update(candle[i.input]);
            }
        });
    }
}

module.exports = Strategy;