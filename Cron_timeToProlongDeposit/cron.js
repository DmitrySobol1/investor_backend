import cron from 'node-cron';
import { checkDepositsForProlong } from './task.js';

import dotenv from 'dotenv';
dotenv.config({ path: '/root/investor/investor_backend/.env' });

// Сценарий для ежедневной проверки депозитов на необходимость продления


cron.schedule(
  '00 12 * * *',
  async () => {
    console.log('🚀 Запуск задачи2... | Проверяю депозиты на продление', new Date().toISOString());

    try {
      await checkDepositsForProlong();
      console.log('✅ Задача2 выполнена');
    } catch (err) {
      console.error('❌ Ошибка задачи2:', err.message);
    }
  },
  {
    scheduled: true,
    timezone: 'Europe/Moscow',
  }
);

console.log('⏰ Планировщик задач2 инициализирован (проверка депозитов на продление)');
