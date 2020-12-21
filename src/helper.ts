const fs = require('fs');

export const sleep = (ms: number): Promise<any> => new Promise(resolve => setTimeout(resolve, ms));

export const writeToFile = (pathOfFile: string, data: string): void => {
  fs.writeFileSync(pathOfFile, data);
}

export const readFromFile = (pathOfFile: string, deleteFile: boolean): any => {
  const data = fs.readFileSync(pathOfFile).toString();
  // check if JSON
  const regex = /^{.*}$/;
  deleteFile ? fs.unlinkSync(pathOfFile) : null;
  return regex.test(data) ? JSON.parse(data) : data;
}


// export const onCallback = (bot: any, params: Array<string>, callback: (ctx, returnValue: string, misc)=>{}, misc): void => {
//   bot.on('callback_query', ctx => {
//     console.log('in helper ', misc);
//     const callbackValue = ctx.callbackQuery.data;
//     if (params.includes(callbackValue)) {
//       callback(ctx, callbackValue, misc);
//     } else {
//       // as default
//       callback(ctx, params[0], misc);
//     }
//   });
// }  