const { requirePrefix } = require('../../handler');


class handlerLoader {
  constructor(managerPrefix, initialHandlers=[]) {
    this.handlers = initialHandlers.slice();

    this.handleMessage = this.handleMessage.bind(this);
  }

  handleMessage(bot, messageInfo) {
    const handlerPromises = this.handlers.map(handler => handler(bot, messageInfo));

    return Promise.all(handlerPromises.concat([this.manageHandlers(bot, messageInfo)]));
  }

  manageHandlers(bot, messageInfo) {
    
  }
}


module.exports = handlerLoader;
