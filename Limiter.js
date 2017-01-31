
const identity = (x) => x;


class Limiter {
  constructor(rate, limit, handleSingle=identity, handleQueue) {
    this.rate = rate;
    this.limit = limit;
    this.sent = 0;
    this.cooling = false;
    this.queue = [];
    this.handleSingle = handleSingle;
    this.handleQueue = handleQueue || 
      (xs => Promise.all(xs.map(x => handleSingle(x))));
  }

  handle(message) {
    if (this.cooling || this.sent > this.limit) {
      if (!this.cooling) {
        this.cooling = true;
        this.startQueue();
      }

      return new Promise((resolve, reject) => {
        this.queue.push({message, resolve, reject});
      });
    } else {
      if (this.sent === 0) {
        setTimeout(() => this.sent = 0, this.rate);
      }

      this.sent++;

      return this.handleSingle(message);
    }
  }

  startQueue() {
    this.interval = setInterval(() => {
      if (this.queue.length === 0) {
        this.cooling = false;
        this.sent = 0;
        clearInterval(this.interval);
        return;
      }

      const toClear = this.queue.slice(0, this.limit);
      this.queue = this.queue.slice(this.limit);

      const messages = toClear.map(x => x.message);
      this.handleQueue(messages)
        .then(responses => {
          if (Array.isArray(responses)) {
            toClear.forEach((x, i) => x.resolve(responses[i]));
          } else {
            toClear.forEach(x => x.resolve());
          }
        });
    }, this.rate);
  }
}

module.exports = Limiter;
