import axios from 'axios';
import UserModel from '../models/user.js';

export const messageTemplates = {
  ru: {
    admin_new_deposit_rqst: 'Новая заявка на создание портфеля',
    admin_new_changepassword_rqst: 'Новый запрос на смену пароля',
    admin_new_question: 'Пришло новое сообщение в разделе поддержка',
    admin_new_prolongation_rqst: 'Новая заявка на продление/выплату',
    admin_time_to_prolong: ({ name, dateUntil, username }) =>
      `У пользователя скоро заканчивается срок портфеля\n\nname: ${name}\nдата окончания портфеля: ${dateUntil}\nusername: ${username || 'no username'}`,
    user_deposit_created: 'Ваш портфель создан',
    user_password_reseted: 'Вы можете установить новый пароль',
    user_deposit_get_all_sum: 'Ваш портфель закрыт',
    user_deposit_get_part_sum: 'Для вас создан новый портфель',
    user_deposit_reinvest_all: 'Ваш портфель продлен',
    user_time_to_prolong: 'Срок действия вашего портфеля скоро заканчивается.\n\nВсе подробности внутри приложения',
    open_app: 'Открыть приложение'
  },
  de: {
    admin_new_deposit_rqst: 'Neuer Antrag auf Portfolio-Erstellung',
    admin_new_changepassword_rqst: 'Neue Anfrage zur Passwortänderung',
    admin_new_question: 'Neue Nachricht im Support-Bereich',
    admin_new_prolongation_rqst: 'Neuer Antrag auf Verlängerung/Auszahlung',
    admin_time_to_prolong: ({ name, dateUntil, username }) =>
      `Das Portfolio eines Benutzers läuft bald ab\n\nName: ${name}\nPortfolio-Enddatum: ${dateUntil}\nUsername: ${username || 'no username'}`,
    user_deposit_created: 'Ihr Portfolio wurde erstellt',
    user_password_reseted: 'Sie können jetzt ein neues Passwort festlegen',
    user_deposit_get_all_sum: 'Ihr Portfolio wurde geschlossen',
    user_deposit_get_part_sum: 'Ein neues Portfolio wurde für Sie erstellt',
    user_deposit_reinvest_all: 'Ihr Portfolio wurde verlängert',
    user_time_to_prolong: 'Die Gültigkeitsdauer Ihres Portfolios läuft bald ab.\n\nAlle Details finden Sie in der App',
    open_app: 'App öffnen'
  }
};

export async function sendTelegramMessage(tlgid, typeMessage, data = null) {
  // Получаем язык пользователя из БД
  const user = await UserModel.findOne({ tlgid });
  const language = user?.language || 'de';

  const templates = messageTemplates[language] || messageTemplates.de;
  const template = templates[typeMessage];
  const openAppText = templates.open_app;

  if (!template) {
    throw new Error(`Unknown message type: ${typeMessage}`);
  }

  const text = typeof template === 'function' ? template(data) : template;

  await axios.post(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
    {
      chat_id: tlgid,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: openAppText, web_app: { url: process.env.APP_URL } }]
        ]
      }
    }
  );
}
