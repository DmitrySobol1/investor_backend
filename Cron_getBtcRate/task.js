// Для тестов:
// 1) поместить файл env в эту папку
// 2) расскоменти две строки 'TEST'
// 3) закомменти 2 строки 'PROD'
// 4) расскоменти EXECUTE
// 5) выполни в терминале: 
// cd Backend/Cron_getBtcRate
// node task.js

// TEST
// import dotenv from 'dotenv';
// dotenv.config();

// EXECUTE
// fetchAndSaveBitcoinPricesBinance();

// PROD
import dotenv from 'dotenv';
dotenv.config({ path: '/root/investor/investor_backend/.env' });


import mongoose from 'mongoose';

import BitcoinPriceModel from '../models/bitcoinPrice.js';


mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log('DB OK'))
  .catch((err) => console.log('db error:', err));




export async function fetchAndSaveBitcoinPricesBinance() {
  // Получаем сегодняшнюю дату по московскому времени (UTC+3)
  const now = new Date();
  const moscowOffset = 3 * 60; // UTC+3 в минутах
  const moscowTime = new Date(now.getTime() + (moscowOffset + now.getTimezoneOffset()) * 60000);

  const day = String(moscowTime.getDate()).padStart(2, '0');
  const month = String(moscowTime.getMonth() + 1).padStart(2, '0');
  const year = moscowTime.getFullYear();
  const dateStr = `${day}-${month}-${year}`;

  try {
    // Проверяем, есть ли уже запись в БД
    const existing = await BitcoinPriceModel.findOne({ date: dateStr });
    if (existing && existing.priceUsd !== null) {
      console.log(`${dateStr} уже есть в БД`);
      return existing;
    }

    // Получаем курс с Binance
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const startTime = date.getTime();
    const endTime = startTime + 24 * 60 * 60 * 1000 - 1;

    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || data.length === 0) {
      console.log(`${dateStr} - нет данных на Binance`);
      return null;
    }

    const priceUsd = parseFloat(data[0][4]); // close price

    // Сохраняем в БД
    const saved = await BitcoinPriceModel.create({
      date: dateStr,
      priceUsd,
      priceEur: null,
    });

    console.log(`Сохранено: ${dateStr} - USD: ${priceUsd}`);
    return saved;
  } catch (err) {
    console.error(`Ошибка для ${dateStr}:`, err.message);
    return null;
  }
}



// =================


