// required indicators: SMA;
// Bollinger Bands implementation;
var util = require ('../../util');
var SMA = require('./SMA.js');
var _ = require('lodash');

class BB {
    constructor(settings) {
        this.input = 'close'
        this.settings = settings;
        this.center = new SMA(this.settings.timePeriod);
        this.positionSize = this.settings.positionSize;
        this.middle = 0;
        this.result = 0;
        this.positions = [];
    }

    calcstd(prices, Average) {
        let squareDiffs = prices.map((value) => {
            let diff = value - Average;
            let sqr = diff * diff;
            return sqr;
        });

        let sum = squareDiffs.reduce((sum, value) => sum + value, 0);
        let avgSquareDiff = sum / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    update(price) {
        this.center.update(price);

        this.middle = this.center.result;
        let std = this.calcstd(this.center.prices, this.middle);

        this.pos = 0;
        _.range(-10,10).forEach(i => {
            if (util.isBetween(price, this.middle + i * std, this.middle + (i+1) * std)) {
                this.pos = i < 0 ? i : i+1;
            }
        });

        this.positions.push(this.pos);
        if (this.positions.length > this.positionSize)
            this.positions.shift();



        let last = _.last(this.positions);
        this.movement =  last - _.first(this.positions);
        this.result = this.pos;
        //console.log(`[${this.positions}] = ${this.result}`);
    }
}

module.exports = BB;
