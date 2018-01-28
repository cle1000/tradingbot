// required indicators
var SMA = require('./SMA');


class SMMA {
  constructor(weight){
    this.input = 'price';
    this.sma = new SMA(weight);
    this.weight = weight;
    this.result = 0;
    this.age = 0;
  }

  update(price) {
      if (this.age <= this.weight) {
          this.sma.update(price);
          this.result = this.sma.result;
      } else {
        this.result = (this.result * (this.weight - 1) + price) / this.weight;
      }
    this.age++;
  }
}

module.exports = SMMA;
