export const sleep = (ms: number): Promise<any> => new Promise(resolve => setTimeout(resolve, ms));

export const onCallback = (bot: any, params: Array<string>, callback: (returnValue: string)=>{}): void => {
  bot.on('callback_query', ctx => {
    const callbackValue = ctx.callbackQuery.data;
    if (params.includes(callbackValue)) {
      callback(callbackValue);
    } else {
      // as default
      callback(params[0]);
    }
  });
}  