import cron from 'node-cron';
import { fetchAndSaveBitcoinPricesBinance } from './task.js';

import dotenv from 'dotenv';
dotenv.config({ path: '/root/investor/investor_backend/.env' });

// import { logger } from '../middlewares/error-logger.js'

//Сценарий, для daily получения курса BTC 


cron.schedule(
  '5 4 * * *',
  async () => {
    console.log('🚀 Запуск задачи1... | Получаю курс BTC', new Date().toISOString());

    try {
      await fetchAndSaveBitcoinPricesBinance();
      console.log('✅ Задача1 выполнена');
    } catch (err) {
      
    // logger.error({
    //       cron_title: 'Ошибка в CRON 1 getBtcRate > при выполнении файла task.js', 
    //       cron_message: err.message,
    //       dataFromServer: err.response?.data,
    //       statusFromServer: err.response?.status,
    //     });
    }
  },
  {
    scheduled: true,
    timezone: 'Europe/Moscow',
  }
);

console.log('⏰ Планировщик задач1 инициализирован, check port=',process.env.PORT);
