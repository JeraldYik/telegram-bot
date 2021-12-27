const messageParser = () => (ctx, next) => {
  if (ctx.updateType === 'message' && ctx.update.message.text) {
    const text = ctx.update.message.text;
    if (text.startsWith('/')) {
      let parsing = text.split(' ');
      const command = parsing.shift();
      const input = parsing.join(' ');

      ctx.state.command = {
        raw: text,
        command,
        input
      };
    }
  }
  return next();
};

export default messageParser;
