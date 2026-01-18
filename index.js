import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
import bcrypt from 'bcrypt';

dotenv.config();

import UserModel from './models/user.js';
import DepositRqstModel from './models/deposit_request.js'
import DepositModel from './models/deposit.js'
import WalletAdressModel from './models/walletadress.js'
import ChangePasswordRqstModel from './models/changepassword_rqst.js'
import QuestionToSupportModel from './models/questionToSupport.js'
import BitcoinPriceModel from './models/bitcoinPrice.js'
import DepositOperationsModel from './models/deposit_operations.js'
import CryptoRateModel from './models/cryptoRate.js'

const app = express();
const PORT = process.env.PORT || 4444;

// MongoDB connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the API',
    status: 'Server is running',
  });
});

// ==========================================
// Получение данных из БД

app.get('/api/stock', async (req, res) => {
  try {
    const stock = await StockModel.find().sort({ orderNumber: 1 });
    res.json(stock);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/stock/:stockId', async (req, res) => {
  try {
    const { stockId } = req.params;
    const stockItem = await StockModel.findById(stockId);
    if (!stockItem) {
      return res.status(404).json({ status: 'error', message: 'Stock item not found' });
    }
    res.json(stockItem);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/courseTypes', async (req, res) => {
  try {
    const courseTypes = await CourseTypeModel.find().sort({ orderNumber: 1 });
    res.json(courseTypes);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/courses/:typeId', async (req, res) => {
  try {
    const { typeId } = req.params;
    const courses = await CourseModel.find({ type: typeId })
      .populate('type')
      .sort({ orderNumber: 1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/lessons/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const lessons = await LessonModel.find({ linkToCourse: courseId })
      .populate('linkToCourse')
      .sort({ numberInListLessons: 1 });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/lesson/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await LessonModel.findById(lessonId).populate('linkToCourse');
    if (!lesson) {
      return res.status(404).json({ status: 'error', message: 'Lesson not found' });
    }
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/user/:tlgid', async (req, res) => {
  try {
    const { tlgid } = req.params;
    const user = await UserModel.findOne({ tlgid });
    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' });
    }
    res.json({
      status: 'success',
      isPayed: user.isPayed || false,
      name: user.name || ''
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Обновить имя пользователя
app.put('/api/user/:tlgid/name', async (req, res) => {
  try {
    const { tlgid } = req.params;
    const { name } = req.body;

    const user = await UserModel.findOneAndUpdate(
      { tlgid },
      { name },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ==========================================
// Прогресс пользователя

// Получить прогресс по уроку
app.get('/api/progress/:tlgid/:lessonId', async (req, res) => {
  try {
    const { tlgid, lessonId } = req.params;
    const progress = await UserProgressSchema.findOne({
      tlgid: tlgid,
      linkToLesson: lessonId
    });
    res.json({ isLearned: progress?.isLearned || false });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Сохранить прогресс (урок пройден)
app.post('/api/progress', async (req, res) => {
  try {
    const { tlgid, lessonId } = req.body;

    const existing = await UserProgressSchema.findOne({
      tlgid: tlgid,
      linkToLesson: lessonId
    });

    if (existing) {
      existing.isLearned = true;
      await existing.save();
      res.json({ status: 'updated', data: existing });
    } else {
      const progress = await UserProgressSchema.create({
        tlgid: tlgid,
        linkToLesson: lessonId,
        isLearned: true
      });
      res.json({ status: 'created', data: progress });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Удалить прогресс (урок не пройден)
app.delete('/api/progress/:tlgid/:lessonId', async (req, res) => {
  try {
    const { tlgid, lessonId } = req.params;
    await UserProgressSchema.deleteOne({
      tlgid: tlgid,
      linkToLesson: lessonId
    });
    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Получить прогресс по всем урокам курса
app.get('/api/progress/:tlgid/course/:courseId', async (req, res) => {
  try {
    const { tlgid, courseId } = req.params;

    // Получаем все уроки курса
    const lessons = await LessonModel.find({ linkToCourse: courseId });
    const lessonIds = lessons.map(l => l._id);

    // Получаем прогресс по этим урокам
    const progress = await UserProgressSchema.find({
      tlgid: tlgid,
      linkToLesson: { $in: lessonIds },
      isLearned: true
    });

    // Возвращаем массив id пройденных уроков
    const learnedLessonIds = progress.map(p => p.linkToLesson.toString());
    res.json({ learnedLessonIds });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ==========================================
// Избранные уроки

// Получить избранное по уроку
app.get('/api/favorite/:tlgid/:lessonId', async (req, res) => {
  try {
    const { tlgid, lessonId } = req.params;
    const favorite = await UserFavoriteLessons.findOne({
      tlgid: tlgid,
      linkToLesson: lessonId
    });
    res.json({ isFavorite: favorite?.isFavorite || false });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Добавить в избранное
app.post('/api/favorite', async (req, res) => {
  try {
    const { tlgid, lessonId } = req.body;

    const existing = await UserFavoriteLessons.findOne({
      tlgid: tlgid,
      linkToLesson: lessonId
    });

    if (existing) {
      existing.isFavorite = true;
      await existing.save();
      res.json({ status: 'updated', data: existing });
    } else {
      const favorite = await UserFavoriteLessons.create({
        tlgid: tlgid,
        linkToLesson: lessonId,
        isFavorite: true
      });
      res.json({ status: 'created', data: favorite });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Удалить из избранного
app.delete('/api/favorite/:tlgid/:lessonId', async (req, res) => {
  try {
    const { tlgid, lessonId } = req.params;
    await UserFavoriteLessons.deleteOne({
      tlgid: tlgid,
      linkToLesson: lessonId
    });
    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Получить все избранные уроки пользователя
app.get('/api/favorites/:tlgid', async (req, res) => {
  try {
    const { tlgid } = req.params;
    const favorites = await UserFavoriteLessons.find({
      tlgid: tlgid,
      isFavorite: true
    }).populate({
      path: 'linkToLesson',
      populate: {
        path: 'linkToCourse',
        populate: {
          path: 'type'
        }
      }
    });

    // Возвращаем только уроки (без обёртки favorites)
    const lessons = favorites
      .filter(f => f.linkToLesson) // Фильтруем записи без урока
      .map(f => f.linkToLesson);

    res.json(lessons);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ==========================================
// Создание информации в БД

app.post('/api/createCourse', async (req, res) => {
  try {
    const doc = await CourseModel.create({
      type: '692e144be7f57a4fd2e9ae28',
      name: 'Как обучить ИИ агента работать в любой программе',
      shortDescription: 'подробнее  ...',
      longDescription: '- обучаем Claude работать в любой программе в браузере с помощью Claude extention for Chrome',
      access: 'free',
      orderNumber: 1,
    });

    res.json({ status: 'done', data: doc });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/createLesson', async (req, res) => {
  try {
    const doc = await LessonModel.create({
      linkToCourse: '694e04ebad4c7b50846ba209',
      name: 'Урок 1. Введение',

      shortDescription: 'подробнее',
      longDescription: '- подготовительные действия перед началом обучения ИИ агента',

      urlToFile: 'https://kinescope.io/gPvLiafYyqtcEXkrRPVgeE',
      numberInListLessons: 1,
      access: 'payment'
    });

    res.json({ status: 'done', data: doc });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});


app.post('/api/addStock', async (req, res) => {
  try {
    const doc = await StockModel.create({
      title: 'Шаблон Telegram mini app',
      subtitle: 'React JS + node js express ',

      shortDescription: 'подробнее ... ',
      longDescription: 'шаблон, чтобы быстро развернуть TMA. Фронтенд на React, бэкенд на node js express',

      text1: 'git clone https://github.com/easydev001/tma_template.git',
      text2: '',
      orderNumber: 1
    });

    res.json({ status: 'done', data: doc });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ===============================================

// Обновить isOnboarded
app.post('/api/set_onboarded', async (req, res) => {
  try {
    const { tlgid } = req.body;

    const user = await UserModel.findOneAndUpdate(
      { tlgid: tlgid },
      { isOnboarded: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ===============================================

// вход пользователя в аппку
app.post('/api/enter', async (req, res) => {
  try {
    const { tlgid, username, language } = req.body; 

    let user = await UserModel.findOne({ tlgid: tlgid });

    // Создание юзера если не существует
    if (!user) {
      const createresponse = await createNewUser(tlgid, username, language);

      console.log('createresponse', createresponse)

      if (createresponse && createresponse.status === 'created') {
        const userData = {};
        console.log('showSetPassword');
        userData.result = 'showSetPassword';
        userData.isFirstEnter = true;
        userData.language = language; // дефолтный язык для нового юзера
        return res.json({ userData });
      } else {
        // Race condition: user might have been created by parallel request
        user = await UserModel.findOne({ tlgid: tlgid });
        if (!user) {
          // Still no user - real error
          return res.json({ statusBE: 'notOk' });
        }
        // User exists - fall through to existing user logic below
        console.log('User found after race condition, continuing with normal flow');
      }
    }

    // Извлечь инфо о юзере из БД (исключаем пароль)
    const { _id, password_hashed, ...userData } = user._doc;

    // Если пароль не установлен (новый юзер или сброшен админом)
    if (!user.isSetPassword) {
      console.log('showSetPassword');
      userData.result = 'showSetPassword';
      userData.isFirstEnter = user.isFirstEnter
      return res.json({ userData });
    }

    // Пароль установлен - показать ввод пароля
    userData.result = 'showEnterPassword';
    userData.isFirstEnter = user.isFirstEnter
    console.log('showEnterPassword');
    return res.json({ userData });
  } catch (err) {
    console.error('Enter error:', err);
  }
  return res.json({ statusBE: 'notOk' });
});

async function createNewUser(tlgid, username, language) {
  try {
    const doc = new UserModel({
      tlgid: tlgid,
      username: username,
      language : language
    });

    const user = await doc.save();

    if (!user) {
      throw new Error('ошибка при создании пользователя в бд UserModel');
    }

    return { status: 'created' };
  } catch (err) {
    return false;
  }
}

// ===============================================
// Отправка сообщения в Telegram бота
// ===============================================
const messageTemplates = {
  payment: 'нажмите 👉/pay , что бы оплатить подписку',
  admin_new_deposit_rqst: 'Новая заявка на создание портфеля',
  admin_new_changepassword_rqst: 'Новый запрос на смену пароля',
  user_deposit_created: 'Ваш портфель создан',
  user_password_reseted: 'Вы можете установить новый пароль'
};

async function sendTelegramMessage(tlgid, typeMessage) {
  const text = messageTemplates[typeMessage];
  if (!text) {
    throw new Error(`Unknown message type: ${typeMessage}`);
  }

  await axios.post(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
    {
      chat_id: tlgid,
      text,
    }
  );
}

app.post('/api/sendMessage', async (req, res) => {
  try {
    const { tlgid, typeMessage } = req.body;

    if (!tlgid) {
      return res.status(400).json({
        status: 'error',
        message: 'tlgid is required'
      });
    }

    if (!typeMessage) {
      return res.status(400).json({
        status: 'error',
        message: 'typeMessage is required'
      });
    }

    await sendTelegramMessage(tlgid, typeMessage);

    return res.json({
      status: 'success',
      message: 'Message sent successfully'
    });
  } catch (err) {
    console.error('Error sending message:', err.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: err.message
    });
  }
});

// ===============================================
// Webhook об оплате
// ===============================================


app.post('/api/webhook_payment', async (req, res) => {
  try {
    const { paydUser, paydSum, paydDays} = req.body;

    console.log('=== WEBHOOK: Получены данные о платеже из бота ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const payment = await PaymentModel.create(
      {
      tlgid: paydUser,
      sum: paydSum,
      payedPeriodInDays: paydDays,
      paymentDateUTC: new Date()
      }
    )

    // Получаем текущего пользователя
    const currentUser = await UserModel.findOne({ tlgid: paydUser });

    // Вычисляем новую дату окончания подписки
    const daysToAdd = Number(paydDays); // Преобразуем строку в число
    let newDateTillPayed;
    if (currentUser.dateTillPayed) {
      // Если есть дата окончания - прибавляем к ней дни
      newDateTillPayed = new Date(currentUser.dateTillPayed);
      newDateTillPayed.setDate(newDateTillPayed.getDate() + daysToAdd);
    } else {
      // Если даты нет - прибавляем к текущей дате
      newDateTillPayed = new Date();
      newDateTillPayed.setDate(newDateTillPayed.getDate() + daysToAdd);
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { tlgid: paydUser },
      {
          $set: {
          dateTillPayed: newDateTillPayed,
          isPayed: true,
        },
      },
      { new: true }
    );

    console.log('new date', updatedUser.dateTillPayed )

    // Форматируем дату в формат DD.MM.YYYY для фронтенда
    const day = String(newDateTillPayed.getDate()).padStart(2, '0');
    const month = String(newDateTillPayed.getMonth() + 1).padStart(2, '0');
    const year = newDateTillPayed.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    // Отправляем ответ платежной системе (обычно требуется 200 OK)
    return res.status(200).json({
      status: 'success',
      dateTillPayed: formattedDate
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({
      status: 'error',
    });
  }
});

// Проверка кодового слова онбординга
app.post('/api/checkCodeWord', async (req, res) => {
  try {
    const { tlgid, codeWord } = req.body;

    if (!tlgid || !codeWord) {
      return res.status(400).json({
        status: 'error',
        message: 'tlgid and codeWord are required'
      });
    }

    // Получаем кодовое слово из env
    const correctCodeWord = process.env.CODE_WORLD;

    // Приводим к нижнему регистру и сравниваем
    if (codeWord.toLowerCase() === correctCodeWord?.toLowerCase()) {
      // Обновляем пользователя
      await UserModel.findOneAndUpdate(
        { tlgid },
        { isOnboarded: true },
        { new: true }
      );

      return res.json({
        status: 'success'
      });
    } else {
      return res.json({
        status: 'wrong'
      });
    }
  } catch (err) {
    console.error('Check code word error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Установка пароля пользователя
// ===============================================
app.post('/api/setPassword', async (req, res) => {
  try {
    const { tlgid, password } = req.body;

    if (!tlgid || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'tlgid and password are required'
      });
    }

    // Хешируем пароль
    const saltRounds = 10;
    const passwordHashed = await bcrypt.hash(password, saltRounds);

    // Обновляем пользователя
    const user = await UserModel.findOneAndUpdate(
      { tlgid },
      {
        password_hashed: passwordHashed,
        isSetPassword: true
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    return res.json({
      status: 'success'
    });
  } catch (err) {
    console.error('Set password error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Проверка пароля пользователя
// ===============================================
app.post('/api/checkPassword', async (req, res) => {
  try {
    const { tlgid, password } = req.body;

    if (!tlgid || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'tlgid and password are required'
      });
    }

    // Находим пользователя
    const user = await UserModel.findOne({ tlgid });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.password_hashed) {
      return res.json({
        status: 'error',
        message: 'Password not set'
      });
    }

    // Сравниваем пароли
    const isMatch = await bcrypt.compare(password, user.password_hashed);

    if (isMatch) {
      return res.json({
        status: 'success'
      });
    } else {
      return res.json({
        status: 'error',
        message: 'Wrong password'
      });
    }
  } catch (err) {
    console.error('Check password error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Создание заявки на депозит
// ===============================================
app.post('/api/create_deposit_request', async (req, res) => {
  try {
    const { tlgid, valute, cryptoCashCurrency, amount, period, riskPercent, username, isFirstEnter } = req.body;

    if (!tlgid || !amount) {
      return res.status(400).json({
        status: 'error',
        message: 'tlgid and amount are required'
      });
    }

    // Нормализуем amount: если пришла строка с запятой, заменяем на точку
    const normalizedAmount = typeof amount === 'string'
      ? Number(amount.replace(',', '.'))
      : Number(amount);

    // Находим пользователя по tlgid
    const user = await UserModel.findOne({ tlgid });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Обновляем данные пользователя
    const updateData = {};
    if (username) {
      updateData.name = username;
    }
    if (isFirstEnter === true) {
      updateData.isFirstEnter = false;
    }
    if (Object.keys(updateData).length > 0) {
      await UserModel.findByIdAndUpdate(user._id, updateData);
    }

    // Создаём заявку на депозит
    const depositRequest = await DepositRqstModel.create({
      user: user._id,
      valute,
      cryptoCashCurrency,
      amount: normalizedAmount,
      period,
      riskPercent,
      isOperated: false
    });

    await sendTelegramMessage(process.env.ADMINTLG, 'admin_new_deposit_rqst');

    return res.json({
      status: 'success',
      data: depositRequest
    });
  } catch (err) {
    console.error('Create deposit request error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Управление адресами кошельков
// ===============================================

// Получить адрес кошелька по имени
app.get('/api/wallet_adress/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const wallet = await WalletAdressModel.findOne({ name });

    if (!wallet) {
      return res.status(404).json({
        status: 'error',
        message: 'Wallet not found'
      });
    }

    return res.json({
      status: 'success',
      data: wallet
    });
  } catch (err) {
    console.error('Get wallet adress error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Редактировать адрес кошелька
app.post('/api/edit_wallet_adress', async (req, res) => {
  try {
    const { name, adress } = req.body;

    if (!name || !adress) {
      return res.status(400).json({
        status: 'error',
        message: 'name and adress are required'
      });
    }

    // Ищем и обновляем, или создаём новый если не найден
    const wallet = await WalletAdressModel.findOneAndUpdate(
      { name },
      { adress },
      { new: true, upsert: true }
    );

    return res.json({
      status: 'success',
      data: wallet
    });
  } catch (err) {
    console.error('Edit wallet adress error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Админ: получить заявки на депозит
// ===============================================
app.get('/api/admin_get_deposit_rqst', async (req, res) => {
  try {
    const depositRequests = await DepositRqstModel.find({ isOperated: false })
      .populate('user', 'tlgid name')
      .sort({ createdAt: -1 });

    return res.json({
      status: 'success',
      data: depositRequests
    });
  } catch (err) {
    console.error('Admin get deposit requests error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Админ: получить один депозит по ID
app.get('/api/admin_get_deposit_one/:depositId', async (req, res) => {
  try {
    const { depositId } = req.params;
    const deposit = await DepositModel.findById(depositId)
      .populate('user', 'tlgid');

    if (!deposit) {
      return res.status(404).json({
        status: 'error',
        message: 'Deposit not found'
      });
    }

    // Получаем операции по депозиту
    const operations = await DepositOperationsModel.find({ deposit_link: depositId })
      .sort({ number_of_week: 1 });

    // Рассчитываем текущую стоимость портфеля (последний week_finish_amount где isFilled = true)
    const filledOperations = operations.filter(op => op.isFilled);
    const currentPortfolioValue = filledOperations.length > 0
      ? filledOperations[filledOperations.length - 1].week_finish_amount
      : deposit.amountInEur;

    return res.json({
      status: 'success',
      data: deposit,
      operations: operations,
      currentPortfolioValue: currentPortfolioValue
    });
  } catch (err) {
    console.error('Admin get deposit one error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Админ: обновить profitPercent депозита
app.put('/api/admin_update_deposit_profit/:depositId', async (req, res) => {
  try {
    const { depositId } = req.params;
    const { profitPercent } = req.body;

    const deposit = await DepositModel.findByIdAndUpdate(
      depositId,
      { profitPercent },
      { new: true }
    );

    if (!deposit) {
      return res.status(404).json({
        status: 'error',
        message: 'Deposit not found'
      });
    }

    return res.json({
      status: 'success',
      data: deposit
    });
  } catch (err) {
    console.error('Admin update deposit profit error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Админ: обновить операцию по депозиту (profit_percent)
app.put('/api/admin_update_deposit_operation/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params;
    const { profit_percent } = req.body;

    const operation = await DepositOperationsModel.findById(operationId);

    if (!operation) {
      return res.status(404).json({
        status: 'error',
        message: 'Operation not found'
      });
    }

    // Пересчитываем week_finish_amount
    const profitEur = operation.week_start_amount * profit_percent / 100;
    const week_finish_amount = Number((operation.week_start_amount + profitEur).toFixed(2));

    // Если первый раз редактируем (isFilled = false) - создаём следующую операцию
    if (!operation.isFilled && !operation.next_operation) {
      // Рассчитываем даты следующей недели
      const nextWeekNumber = operation.number_of_week + 1;

      // Дата начала следующей недели = дата окончания текущей + 1 день
      const nextWeekStart = new Date(operation.week_date_finish);
      nextWeekStart.setDate(nextWeekStart.getDate() + 1);
      nextWeekStart.setHours(0, 0, 0, 0);

      // Дата окончания следующей недели = начало + 6 дней (воскресенье)
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      nextWeekEnd.setHours(23, 59, 59, 999);

      // Создаём новую операцию
      const newOperation = await DepositOperationsModel.create({
        user_link: operation.user_link,
        deposit_link: operation.deposit_link,
        week_date_start: nextWeekStart,
        week_date_finish: nextWeekEnd,
        week_start_amount: week_finish_amount,
        week_finish_amount: week_finish_amount,
        number_of_week: nextWeekNumber,
        profit_percent: 0,
        isFilled: false
      });

      // Обновляем текущую операцию с ссылкой на новую
      const updatedOperation = await DepositOperationsModel.findByIdAndUpdate(
        operationId,
        {
          profit_percent: profit_percent,
          week_finish_amount: week_finish_amount,
          isFilled: true,
          next_operation: newOperation._id
        },
        { new: true }
      );

      return res.json({
        status: 'success',
        data: updatedOperation,
        newOperation: newOperation
      });
    }

    // Если есть next_operation - обновляем week_start_amount у следующей операции
    if (operation.next_operation) {
      await DepositOperationsModel.findByIdAndUpdate(
        operation.next_operation,
        {
          week_start_amount: week_finish_amount,
          week_finish_amount: week_finish_amount
        }
      );
    }

    const updatedOperation = await DepositOperationsModel.findByIdAndUpdate(
      operationId,
      {
        profit_percent: profit_percent,
        week_finish_amount: week_finish_amount,
        isFilled: true
      },
      { new: true }
    );

    return res.json({
      status: 'success',
      data: updatedOperation
    });
  } catch (err) {
    console.error('Admin update deposit operation error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Админ: получить одну заявку на депозит по ID
app.get('/api/admin_get_deposit_rqst_one/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const depositRequest = await DepositRqstModel.findById(requestId)
      .populate('user', 'tlgid name username');

    if (!depositRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Deposit request not found'
      });
    }

    return res.json({
      status: 'success',
      data: depositRequest
    });
  } catch (err) {
    console.error('Admin get deposit request one error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Админ: создать новый депозит (портфель)
// ===============================================
app.post('/api/create_new_deposit', async (req, res) => {
  try {
    const { requestId, exchangeRate, amountInEur } = req.body;

    if (!requestId) {
      return res.status(400).json({
        status: 'error',
        message: 'requestId is required'
      });
    }

    // Находим заявку
    const depositRequest = await DepositRqstModel.findById(requestId).populate('user');

    
    if (!depositRequest) {
      return res.status(404).json({
        status: 'error',
        message: 'Deposit request not found'
      });
    }

    const userTlgid = depositRequest.user.tlgid;


    // Рассчитываем дату окончания депозита
    const dateUntil = new Date();
    dateUntil.setMonth(dateUntil.getMonth() + depositRequest.period);

    // Создаём депозит (портфель)
    const amountInEurNum = amountInEur ? Number(amountInEur) : null;
    const deposit = await DepositModel.create({
      user: depositRequest.user,
      depositRequest: depositRequest._id,
      valute: depositRequest.valute,
      cryptoCashCurrency: depositRequest.cryptoCashCurrency,
      amount: depositRequest.amount,
      exchangeRate: exchangeRate ? Number(exchangeRate) : null,
      amountInEur: amountInEurNum,
      // profitPercent: 0,
      // profitEur: amountInEurNum,
      period: depositRequest.period,
      date_until: dateUntil,
      riskPercent: depositRequest.riskPercent,
      isActive: true
    });

    // Создаём первую запись операции по депозиту
    const today = new Date();

    // Номер текущей недели в году
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const days = Math.floor((today.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const numberOfWeek = Math.ceil((days + startOfYear.getDay() + 1) / 7);

    // Дата окончания текущей недели (воскресенье)
    const dayOfWeek = today.getDay();
    const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + diffToSunday);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartAmount = Number((depositRequest.amount * Number(exchangeRate)).toFixed(2));

    await DepositOperationsModel.create({
      user_link: depositRequest.user._id,
      deposit_link: deposit._id,
      week_date_start: today,
      week_date_finish: weekEnd,
      week_start_amount: weekStartAmount,
      week_finish_amount: weekStartAmount,
      number_of_week: numberOfWeek,
      profit_percent: 0,
      isFilled: false
    });

    // Обновляем заявку - помечаем как обработанную
    await DepositRqstModel.findByIdAndUpdate(requestId, { isOperated: true });

    await sendTelegramMessage(userTlgid, 'user_deposit_created');

    return res.json({
      status: 'success',
      data: deposit
    });
  } catch (err) {
    console.error('Create new deposit error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Получить депозиты пользователя по tlgid
// ===============================================
app.get('/api/get_user_deposits/:tlgid', async (req, res) => {
  try {
    const { tlgid } = req.params;

    // Находим пользователя по tlgid
    const user = await UserModel.findOne({ tlgid });

    if (!user) {
      return res.json({
        status: 'success',
        data: []
      });
    }

    // Находим все депозиты пользователя, сортировка по дате создания (по возрастанию)
    const deposits = await DepositModel.find({ user: user._id })
      .sort({ createdAt: 1 })
      .lean();

    // Для каждого депозита вычисляем currentPortfolioValue
    const depositsWithPortfolioValue = await Promise.all(
      deposits.map(async (deposit) => {
        // Находим последнюю заполненную операцию по данному депозиту
        const lastFilledOperation = await DepositOperationsModel.findOne({
          deposit_link: deposit._id,
          isFilled: true
        }).sort({ number_of_week: -1 });

        const currentPortfolioValue = lastFilledOperation
          ? lastFilledOperation.week_finish_amount
          : deposit.amountInEur;

        return {
          ...deposit,
          currentPortfolioValue
        };
      })
    );

    return res.json({
      status: 'success',
      data: depositsWithPortfolioValue
    });
  } catch (err) {
    console.error('Get user deposits error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Получить один депозит по ID (для пользователя)
// ===============================================
app.get('/api/get_deposit_one/:depositId', async (req, res) => {
  try {
    const { depositId } = req.params;

    const deposit = await DepositModel.findById(depositId);

    if (!deposit) {
      return res.status(404).json({
        status: 'error',
        message: 'Deposit not found'
      });
    }

    // Находим все заполненные операции по данному депозиту
    const operations = await DepositOperationsModel.find({
      deposit_link: deposit._id,
      isFilled: true
    }).sort({ number_of_week: 1 });

    // Берём последнюю для currentPortfolioValue
    const lastFilledOperation = operations.length > 0
      ? operations[operations.length - 1]
      : null;

    const currentPortfolioValue = lastFilledOperation
      ? lastFilledOperation.week_finish_amount
      : deposit.amountInEur;

    return res.json({
      status: 'success',
      data: deposit,
      operations,
      currentPortfolioValue
    });
  } catch (err) {
    console.error('Get deposit one error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Админ: получить всех пользователей
// ===============================================
app.get('/api/admin_get_all_users', async (req, res) => {
  try {
    const users = await UserModel.find({ role: { $ne: 'admin' } })
      .select('-password_hashed')
      .sort({ createdAt: -1 })
      .lean();

    // Получаем активные депозиты для каждого пользователя
    const usersWithDeposits = await Promise.all(
      users.map(async (user) => {
        const deposits = await DepositModel.find({
          user: user._id,
          isActive: true
        }).lean();
        return { ...user, deposits };
      })
    );

    return res.json({
      status: 'success',
      data: usersWithDeposits
    });
  } catch (err) {
    console.error('Admin get all users error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Админ: получить заявки на смену пароля
// ===============================================
app.get('/api/admin_get_changepassword_rqst', async (req, res) => {
  try {
    const requests = await ChangePasswordRqstModel.find({
      isOperated: false,
      status: 'new'
    })
      .populate('user', 'tlgid name')
      .sort({ createdAt: -1 });

    return res.json({
      status: 'success',
      data: requests
    });
  } catch (err) {
    console.error('Admin get change password requests error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Админ: обнулить пароль пользователя
app.post('/api/admin_reset_password', async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        status: 'error',
        message: 'requestId is required'
      });
    }

    // Находим заявку
    const request = await ChangePasswordRqstModel.findById(requestId).populate('user');

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Change password request not found'
      });
    }

    const userTlgid = request.user.tlgid;

    // Обновляем заявку
    await ChangePasswordRqstModel.findByIdAndUpdate(requestId, {
      isOperated: true,
      status: 'confirmed'
    });

    // Обнуляем пароль пользователя
    await UserModel.findByIdAndUpdate(request.user, {
      isSetPassword: false
    });

    await sendTelegramMessage(userTlgid, 'user_password_reseted');

    return res.json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (err) {
    console.error('Admin reset password error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Админ: отклонить заявку на смену пароля
app.post('/api/admin_reject_changepassword_rqst', async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        status: 'error',
        message: 'requestId is required'
      });
    }

    const request = await ChangePasswordRqstModel.findById(requestId);

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Change password request not found'
      });
    }

    await ChangePasswordRqstModel.findByIdAndUpdate(requestId, {
      isOperated: true,
      status: 'reject'
    });

    return res.json({
      status: 'success',
      message: 'Request rejected successfully'
    });
  } catch (err) {
    console.error('Admin reject change password request error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Админ: получить одну заявку на смену пароля по ID
app.get('/api/admin_get_changepassword_rqst_one/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ChangePasswordRqstModel.findById(requestId)
      .populate('user', 'tlgid name');

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Change password request not found'
      });
    }

    return res.json({
      status: 'success',
      data: request
    });
  } catch (err) {
    console.error('Admin get change password request one error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Запрос на смену пароля
// ===============================================
app.post('/api/new_changepassword_rqst', async (req, res) => {
  try {
    const { tlgid } = req.body;

    if (!tlgid) {
      return res.status(400).json({
        status: 'error',
        message: 'tlgid is required'
      });
    }

    // Находим пользователя по tlgid
    const user = await UserModel.findOne({ tlgid });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Создаём запрос на смену пароля
    await ChangePasswordRqstModel.create({
      user: user._id,
      isOperated: false
    });

    await sendTelegramMessage(process.env.ADMINTLG, 'admin_new_changepassword_rqst');

    return res.json({
      status: 'success',
      message: 'Change password request created'
    });
  } catch (err) {
    console.error('New change password request error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ===============================================
// Запрос в поддержку
// ===============================================
app.post('/api/new_request_to_support', async (req, res) => {
  try {
    const { tlgid, question } = req.body;

    if (!tlgid || !question) {
      return res.status(400).json({
        status: 'error',
        message: 'tlgid and question are required'
      });
    }

    // Находим пользователя по tlgid
    const user = await UserModel.findOne({ tlgid });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Создаём запрос в поддержку
    await QuestionToSupportModel.create({
      user: user._id,
      question
    });

    return res.json({
      status: 'success',
      message: 'Support request created'
    });
  } catch (err) {
    console.error('New support request error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// ******************************
// запрос курса
// ******************************

app.get('/api/btc', async (req, res) => {
  const date = '17-01-2025';
  const price = await getBitcoinPrice(date, 'usd');




  res.json({
    price,
  });
});


// Курс на конкретную дату (формат: DD-MM-YYYY)
async function getBitcoinPrice(date, currency = 'usd') {
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/history?date=${date}`);
  const data = await res.json();
  return data.market_data?.current_price?.[currency] || null;
}

// Получить курсы биткоина за диапазон дат и сохранить в БД
async function fetchAndSaveBitcoinPrices(startDate, endDate) {
  const parseDate = (str) => {
    const [day, month, year] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const results = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);

    // Проверяем, есть ли уже запись с данными
    const existing = await BitcoinPriceModel.findOne({ date: dateStr });
    if (existing && existing.priceUsd !== null && existing.priceEur !== null) {
      console.log(`${dateStr} уже есть в БД`);
      results.push(existing);
      continue;
    }

    try {
      const priceUsd = await getBitcoinPrice(dateStr, 'usd');
      const priceEur = await getBitcoinPrice(dateStr, 'eur');

      let saved;
      if (existing) {
        // Перезаписываем запись с null значениями
        existing.priceUsd = priceUsd;
        existing.priceEur = priceEur;
        saved = await existing.save();
        console.log(`Обновлено: ${dateStr} - USD: ${priceUsd}, EUR: ${priceEur}`);
      } else {
        saved = await BitcoinPriceModel.create({
          date: dateStr,
          priceUsd,
          priceEur,
        });
        console.log(`Сохранено: ${dateStr} - USD: ${priceUsd}, EUR: ${priceEur}`);
      }

      results.push(saved);

      // Задержка 1.5 сек, чтобы не превысить лимит API
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (err) {
      console.error(`Ошибка для ${dateStr}:`, err.message);
    }
  }

  return results;
}

// Эндпоинт для запуска загрузки курсов (CoinGecko)
app.post('/api/fetch_bitcoin_prices', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate are required (format: DD-MM-YYYY)'
      });
    }

    const results = await fetchAndSaveBitcoinPrices(startDate, endDate);

    res.json({
      status: 'success',
      message: `Загружено ${results.length} записей`,
      data: results
    });
  } catch (err) {
    console.error('Ошибка при загрузке курсов:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// ******************************
// Binance API
// ******************************

// Получить курс биткоина с Binance за конкретную дату
async function getBitcoinPriceBinance(dateStr) {
  // Парсим дату DD-MM-YYYY
  const [day, month, year] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const startTime = date.getTime();
  const endTime = startTime + 24 * 60 * 60 * 1000 - 1; // конец дня

  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=1`;

  const res = await fetch(url);
  const data = await res.json();

  if (data && data.length > 0) {
    // [0] open time, [1] open, [2] high, [3] low, [4] close, ...
    return {
      priceUsd: parseFloat(data[0][4]), // close price
      open: parseFloat(data[0][1]),
      high: parseFloat(data[0][2]),
      low: parseFloat(data[0][3]),
      close: parseFloat(data[0][4]),
    };
  }
  return null;
}

// Получить курсы биткоина за диапазон дат с Binance и сохранить в БД
async function fetchAndSaveBitcoinPricesBinance(startDate, endDate) {
  const parseDate = (str) => {
    const [day, month, year] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const results = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);

    // Проверяем, есть ли уже запись с данными
    const existing = await BitcoinPriceModel.findOne({ date: dateStr });
    if (existing && existing.priceUsd !== null) {
      console.log(`${dateStr} уже есть в БД`);
      results.push(existing);
      continue;
    }

    try {
      const priceData = await getBitcoinPriceBinance(dateStr);

      if (!priceData) {
        console.log(`${dateStr} - нет данных на Binance`);
        continue;
      }

      let saved;
      if (existing) {
        existing.priceUsd = priceData.priceUsd;
        saved = await existing.save();
        console.log(`Обновлено: ${dateStr} - USD: ${priceData.priceUsd}`);
      } else {
        saved = await BitcoinPriceModel.create({
          date: dateStr,
          priceUsd: priceData.priceUsd,
          priceEur: null, // Binance не даёт EUR напрямую
        });
        console.log(`Сохранено: ${dateStr} - USD: ${priceData.priceUsd}`);
      }

      results.push(saved);

      // Задержка 200мс (Binance более лояльный к запросам)
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Ошибка для ${dateStr}:`, err.message);
    }
  }

  return results;
}

// Эндпоинт для загрузки курсов с Binance
app.post('/api/fetch_bitcoin_prices_binance', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate are required (format: DD-MM-YYYY)'
      });
    }

    const results = await fetchAndSaveBitcoinPricesBinance(startDate, endDate);

    res.json({
      status: 'success',
      message: `Загружено ${results.length} записей с Binance`,
      data: results
    });
  } catch (err) {
    console.error('Ошибка при загрузке курсов с Binance:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// Получить все курсы биткоина из БД
app.get('/api/bitcoin_prices', async (req, res) => {
  try {
    const prices = await BitcoinPriceModel.find({ priceUsd: { $ne: null } })
      .sort({ date: 1 })
      .lean();

    res.json({ status: 'success', data: prices });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ***********************************
// Получить все курсы из БД cryptoRate
// ***********************************
app.get('/api/get_crypto_rates', async (req, res) => {
  try {
    const rates = await CryptoRateModel.find().lean();
    res.json({
      status: 'success',
      data: rates
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ***********************************
// записать инфо в БД cryptoRate
// ***********************************

app.post('/api/update_crypto_rate', async (req, res) => {
  try {
    const { name, value } = req.body;

    if (!name || value === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'name and value are required'
      });
    }

    // Нормализуем value: если пришла строка с запятой, заменяем на точку
    const normalizedValue = typeof value === 'string'
      ? Number(value.replace(',', '.'))
      : Number(value);

    // Ищем и обновляем, или создаём новый если не найден
    const cryptoRate = await CryptoRateModel.findOneAndUpdate(
      { name },
      { value: normalizedValue },
      { new: true, upsert: true }
    );

    res.json({
      status: 'success',
      data: cryptoRate
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});



// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}`);
});
