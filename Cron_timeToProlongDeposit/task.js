// Для тестов:
// 1) поместить файл env в эту папку
// 2) расскоменти две строки 'TEST'
// 3) закомменти 2 строки 'PROD'
// 4) расскоменти EXECUTE
// 5) выполни в терминале:
// cd Backend/Cron_timeToProlongDeposit
// node task.js

// TEST
// import dotenv from 'dotenv';
// dotenv.config();


// PROD
import dotenv from 'dotenv';
dotenv.config({ path: '/root/investor/investor_backend/.env' });


// EXECUTE
// checkDepositsForProlong();


import mongoose from 'mongoose';

import DepositModel from '../models/deposit.js';
import UserModel from '../models/user.js';
import { sendTelegramMessage } from '../utils/telegram.js';


// Подключаемся к БД и только потом выполняем проверку
mongoose
    .connect(process.env.DATABASE_URL)
    .then(() => console.log('DB OK'))
    .catch((err) => console.log('db error:', err));



export async function checkDepositsForProlong() {
  try {
    // Получаем сегодняшнюю дату по московскому времени (UTC+3)
    const now = new Date();
    const moscowOffset = 3 * 60;
    const moscowTime = new Date(now.getTime() + (moscowOffset + now.getTimezoneOffset()) * 60000);
    // Обнуляем время для корректного сравнения дат
    moscowTime.setHours(0, 0, 0, 0);

    // Получаем все активные депозиты
    const deposits = await DepositModel.find({ isActive: true });

    let updatedCount = 0;

    for (const deposit of deposits) {
      if (!deposit.date_until) continue;

      const dateUntil = new Date(deposit.date_until);
      dateUntil.setHours(0, 0, 0, 0);

      // Разница в днях
      const diffTime = dateUntil.getTime() - moscowTime.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Если осталось 7 или 14 дней — ставим isTimeToProlong = true
      if (diffDays >= 0 && (diffDays === 7 || diffDays === 14) && deposit.isActive && !deposit.isMadeActionToProlong) {
        await DepositModel.updateOne(
          { _id: deposit._id },
          { $set: { isTimeToProlong: true } }
        );
        updatedCount++;
        console.log(`Deposit ${deposit._id}: осталось ${diffDays} дней, isTimeToProlong = true`);

        // Получаем данные пользователя
        const user = await UserModel.findById(deposit.user);

        // Отправляем уведомление пользователю
        try {
          if (user?.tlgid) {
            await sendTelegramMessage(user.tlgid, 'user_time_to_prolong');
            console.log(`Уведомление отправлено пользователю ${user.tlgid}`);
          }
        } catch (msgErr) {
          console.error(`Ошибка отправки уведомления для депозита ${deposit._id}:`, msgErr.message);
        }

        // Отправляем уведомление админам
        const adminTlgIds = process.env.ADMINTLG?.split(',').map(id => id.trim()).filter(Boolean) || [];
        const dateUntilFormatted = deposit.date_until.toLocaleDateString('ru-RU');
        for (const adminTlgId of adminTlgIds) {
          try {
            await sendTelegramMessage(adminTlgId, 'admin_time_to_prolong', {
              name: user?.name || 'unknown',
              dateUntil: dateUntilFormatted,
              username: user?.username
            });
            console.log(`Уведомление отправлено админу ${adminTlgId}`);
          } catch (adminMsgErr) {
            console.error(`Ошибка отправки уведомления админу ${adminTlgId}:`, adminMsgErr.message);
          }
        }

      }
    }

    console.log(`✅ Проверка депозитов завершена. Обновлено: ${updatedCount}`);
    return updatedCount;
  } catch (err) {
    console.error('Ошибка при проверке депозитов:', err.message);
    return null;
  }
}





