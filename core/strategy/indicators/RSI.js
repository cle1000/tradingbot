// required indicators
var SMMA = require('./SMMA.js');

class RSI {
    constructor(settings) {
        this.input = 'close';
        this.lastPrice = null;
        this.weight = settings.interval;
        this.avgU = new SMMA(this.weight);
        this.avgD = new SMMA(this.weight);
        this.u = 0;
        this.d = 0;
        this.rs = 0;
        this.result = 0;
        this.age = 0;
    }

    update(price) {
      let currentPrice = price;

      if (this.lastPrice === null) {
        // Set initial price to prevent invalid change calculation
        this.lastPrice = currentPrice;

        // Do not calculate RSI for this reason - there's no change!
        this.age++;
        return;
      }

      if (currentPrice > this.lastPrice) {
        this.u = currentPrice - this.lastPrice;
        this.d = 0;
      } else {
        this.u = 0;
        this.d = this.lastPrice - currentPrice;
      }

      this.avgU.update(this.u);
      this.avgD.update(this.d);

      this.rs = this.avgU.result / this.avgD.result;
      this.result = 100 - (100 / (1 + this.rs));

      if (this.avgD.result === 0 && this.avgU.result !== 0) {
        this.result = 100;
      } else if (this.avgD.result === 0) {
        this.result = 0;
      }

      this.lastPrice = currentPrice;
      this.age++;
    }
}
module.exports = RSI;
