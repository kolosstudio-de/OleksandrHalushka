const SPREADSHEET_ID = '1VlK7q7USlSkRxw3NmAfxnYdP9_BLOKvue7sUy_m6E78';
const OWNER_EMAIL = 'info@keepitvideo.de';
const CALENDAR_ID = 'primary'; 
const SHEET_ZAYAVKI_AUTO = 'Zayavki_Auto';
const SHEET_CLIENTS_AUTO = 'Clients_Auto';
const SHEET_ZAYAVKI_BAU = 'Zayavki_Bau';
const SHEET_CLIENTS_BAU = 'Clients_Bau';

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('AlexGruppee CRM')
    .addItem('Sync Clients (Auto)', 'manualSyncClientsAuto')
    .addItem('Sync Clients (Bau)', 'manualSyncClientsBau')
    .addToUi();
}

function doGet(e) {
  const action = e.parameter.action;
  const id = e.parameter.id;
  const source = e.parameter.source || 'Auto';
  
  if (action === 'confirm' && id) {
    const template = HtmlService.createTemplateFromFile('MobileConfirmUI');
    template.rowId = id;
    template.source = source;
    return template.evaluate()
      .setTitle('AlexGruppee: CRM')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return ContentService.createTextOutput("AlexGruppee CRM V2 Active");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const targetSheetName = data.source === 'Bau' ? SHEET_ZAYAVKI_BAU : SHEET_ZAYAVKI_AUTO;
    const sheet = ss.getSheetByName(targetSheetName);
    
    const eventId = createCalendarEvent(data);
    const rowData = [
      data.timestamp || new Date().toISOString(),
      data.firstName || "",
      data.lastName || "",
      data.email || "",
      data.phone || "",
      data.contactPref || "",
      data.topic || "",
      data.prefDate || "",
      data.prefTime || "",
      data.message || "",
      data.language || "de",
      data.source || "",
      'New',
      '',
      '',
      eventId // Column 16: Calendar Event ID
    ];
    sheet.appendRow(rowData);
    syncClient(data);
    try { sendOwnerNotification(data, sheet.getLastRow()); } catch(ignore) {}
    try { sendInitialConfirmation(data); } catch(ignore) {}
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncClient(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const targetSheetName = data.source === 'Bau' ? SHEET_CLIENTS_BAU : SHEET_CLIENTS_AUTO;
  const sheet = ss.getSheetByName(targetSheetName);
  const rows = sheet.getDataRange().getValues();
  const email = (data.email || "").toLowerCase();
  const phone = data.phone || "";
  let foundIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][3] && rows[i][3].toLowerCase() === email) || (rows[i][4] && rows[i][4] === phone)) {
      foundIndex = i + 1;
      break;
    }
  }
  if (foundIndex > 0) {
    const currentVisits = rows[foundIndex-1][5] || 0;
    sheet.getRange(foundIndex, 6).setValue(currentVisits + 1);
    sheet.getRange(foundIndex, 7).setValue(new Date());
  } else {
    sheet.appendRow(["C-" + Utilities.getUuid().substring(0,8), data.firstName, data.lastName, email, phone, 1, new Date()]);
  }
}

function uiConfirmBooking() {
  SpreadsheetApp.getUi().alert("Please use the mobile confirmation link from your email.");
}

function executeFinalConfirmation(row, finalDateTime, notes, source, status) {
  if (!row || isNaN(row)) throw new Error("Invalid Row ID received: " + row);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const targetSheetName = source === 'Bau' ? SHEET_ZAYAVKI_BAU : SHEET_ZAYAVKI_AUTO;
  const sheet = ss.getSheetByName(targetSheetName);
  
  const dataValues = sheet.getRange(Number(row), 1, 1, 16).getValues()[0];
  const data = {
    firstName: dataValues[1],
    lastName: dataValues[2],
    email: dataValues[3],
    phone: dataValues[4],
    topic: dataValues[6],
    language: dataValues[10],
    source: dataValues[11] || source,
    eventId: dataValues[15] // Column 16
  };
  
  if (status === 'Reject') {
    sheet.getRange(row, 13).setValue('Rejected');
    sheet.getRange(row, 15).setValue(notes || 'Termin abgelehnt');
    if (data.eventId) {
      try { CalendarApp.getCalendarById(CALENDAR_ID).getEventById(data.eventId).deleteEvent(); } catch(e){}
    }
    // Only send rejection email for Auto
    if (source === 'Auto') {
      sendRejectionEmail(data);
    }
    return "Rejected";
  }

  // Confirmation flow
  sheet.getRange(row, 13).setValue('Confirmed');
  sheet.getRange(row, 14).setValue(finalDateTime);
  sheet.getRange(row, 15).setValue(notes);
  
  updateCalendar(data, finalDateTime);
  
  // Only send confirmation email for Auto
  if (source === 'Auto') {
    sendFinalConfirmationEmail(data, finalDateTime);
  }
  
  return "Success";
}

function sendRejectionEmail(data) {
  const templates = {
    de: { subject: 'Terminabsage – AlexGruppee', body: `Hallo ${data.firstName},\n\nleider sind an Ihrem Wunschtermin bereits alle Kapazitäten ausgeschöpft. Wir melden uns in Kürze mit einem Alternativvorschlag.\n\nViele Grüße,\nAlexGruppee` },
    en: { subject: 'Appointment Unavailable – AlexGruppee', body: `Hello ${data.firstName},\n\nUnfortunately, we are fully booked at your requested time. We will contact you shortly with an alternative proposal.\n\nBest regards,\nAlexGruppee` },
    ru: { subject: 'Отмена записи – AlexGruppee', body: `Здравствуйте, ${data.firstName}!\n\nК сожалению, на выбранное вами время все места заняты. Мы скоро свяжемся с вами, чтобы предложить альтернативу.\n\nС уважением,\nAlexGruppee` },
    uk: { subject: 'Скасування запису – AlexGruppee', body: `Вітаємо, ${data.firstName}!\n\nНа жаль, на обраний вами час усі місця зайняті. Ми скоро зв'яжемося з вами, щоб запропонувати альтернативу.\n\nЗ повагою,\nAlexGruppee` }
  };
  const t = templates[data.language] || templates.de;
  if (data.email) GmailApp.sendEmail(data.email, t.subject, t.body, { name: 'AlexGruppee' });
}

function updateCalendar(data, finalDateTime) {
  try {
    const cal = CalendarApp.getCalendarById(CALENDAR_ID);
    const start = new Date(finalDateTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    
    if (data.eventId) {
      const event = cal.getEventById(data.eventId);
      if (event) {
        event.setTitle('AlexGruppee CONFIRMED: ' + data.firstName + ' ' + data.lastName);
        event.setTime(start, end);
        event.setDescription('Topic: ' + data.topic + '\nNotes: ' + (data.source === 'Bau' ? 'Bauprojekt Besprechung' : 'Werkstatt Termin'));
        if (data.source === 'Bau') {
          event.setColor(CalendarApp.EventColor.ORANGE);
        } else {
          event.setColor(CalendarApp.EventColor.BLUE);
        }
        return;
      }
    }
    // Fallback if event not found or no ID
    const newEvent = cal.createEvent('AlexGruppee CONFIRMED: ' + data.firstName + ' ' + data.lastName, start, end, {
      description: 'Topic: ' + data.topic,
      location: data.source === 'Auto' ? 'Industriestr. 22, 93077 Bad Abbach' : ''
    });
    if (data.source === 'Bau') newEvent.setColor(CalendarApp.EventColor.ORANGE);
    else newEvent.setColor(CalendarApp.EventColor.BLUE);
  } catch (err) {
    console.error("Calendar update error: " + err);
  }
}

function sendInitialConfirmation(data) {
  const signatur = '\n\nAlexGruppee\nInh. Oleksandr Halushka\nIndustriestraße 22, 93077 Bad Abbach\ninfo@alexgruppee.de';
  
  const cmDict = {
    de: { email: 'per E-Mail', wa_text: 'per WhatsApp (Nachricht)', wa_audio: 'per WhatsApp (Anruf)', phone: 'telefonisch' },
    en: { email: 'by email', wa_text: 'via WhatsApp (Text)', wa_audio: 'via WhatsApp (Call)', phone: 'by phone' },
    ru: { email: 'через E-Mail', wa_text: 'через WhatsApp (сообщение)', wa_audio: 'через WhatsApp (звонок)', phone: 'по телефону' },
    uk: { email: 'через E-Mail', wa_text: 'через WhatsApp (повідомлення)', wa_audio: 'через WhatsApp (дзвінок)', phone: 'телефоном' }
  };
  const contactStr = (cmDict[data.language] && cmDict[data.language][data.contactPref]) || cmDict.de[data.contactPref] || data.contactPref;
  
  const tDe = data.prefTime !== 'any' && data.prefTime ? ` zwischen ${data.prefTime} Uhr` : '';
  const tEn = data.prefTime !== 'any' && data.prefTime ? ` between ${data.prefTime}` : '';
  const tRu = data.prefTime !== 'any' && data.prefTime ? ` в период с ${data.prefTime}` : '';
  const tUk = data.prefTime !== 'any' && data.prefTime ? ` у період з ${data.prefTime}` : '';

  const templates = {
    de: { subject: 'Ihre Anfrage bei AlexGruppee', body: `Hallo ${data.firstName},\n\nvielen Dank für Ihre Anfrage. Wir melden uns bei Ihnen am ${data.prefDate}${tDe} ${contactStr}, um die Details zu "${data.topic}" zu besprechen.\n\nBis bald,${signatur}` },
    uk: { subject: 'Ваша заявка в AlexGruppee', body: `Вітаємо, ${data.firstName}!\n\nДякуємо за звернення. Ми зв'яжемося з вами ${data.prefDate}${tUk} ${contactStr}, щоб обговорити деталі щодо "${data.topic}".\n\nДо зв'язку,${signatur}` },
    ru: { subject: 'Ваша заявка в AlexGruppee', body: `Здравствуйте, ${data.firstName}!\n\nСпасибо за обращение. Мы свяжемся с вами ${data.prefDate}${tRu} ${contactStr}, чтобы обсудить детали по "${data.topic}".\n\nДо связи,${signatur}` },
    en: { subject: 'Your request at AlexGruppee', body: `Hello ${data.firstName},\n\nThank you for reaching out. We will contact you on ${data.prefDate}${tEn} ${contactStr} to discuss the details regarding "${data.topic}".\n\nTalk to you soon,${signatur}` }
  };
  const t = templates[data.language] || templates.de;
  if (data.email) GmailApp.sendEmail(data.email, t.subject, t.body, { name: 'AlexGruppee' });
}

function sendFinalConfirmationEmail(data, finalDateTime) {
  const start = new Date(finalDateTime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const formatted = start.toLocaleString();
  
  // Format for Google Calendar Link (YYYYMMDDTHHMMSS)
  const fDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const calTitle = encodeURIComponent('AlexGruppee Termin: ' + data.topic);
  const calLoc = encodeURIComponent('Industriestraße 22, 93077 Bad Abbach');
  const calDetails = encodeURIComponent('Ihr Termin bei AlexGruppee. Wir freuen uns auf Sie!');
  const gCalLink = 'https://www.google.com/calendar/render?action=TEMPLATE&text=' + calTitle + 
                  '&dates=' + fDate(start) + '/' + fDate(end) + 
                  '&details=' + calDetails + '&location=' + calLoc;

  const signaturHtml = '<br><br><b>AlexGruppee</b><br>Inh. Oleksandr Halushka<br>Industriestraße 22, 93077 Bad Abbach<br><a href="mailto:info@alexgruppee.de" style="color:#1e40af;">info@alexgruppee.de</a>';
  const btnStyle = 'display:inline-block;padding:12px 24px;background-color:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;margin:15px 0;font-family:sans-serif;';
  
  const templates = {
    de: { 
      subject: 'Ihr Termin ist bestätigt – AlexGruppee', 
      body: `Hallo ${data.firstName},\n\nIhr Termin bei uns steht fest:\n\nZeit: ${formatted}\nOrt: Industriestraße 22, 93077 Bad Abbach\n\nZum Google Kalender hinzufügen:\n${gCalLink}\n\nWir freuen uns auf Sie!\n\nAlexGruppee\nInh. Oleksandr Halushka...`,
      htmlBody: `<div style="font-family:sans-serif;color:#333;line-height:1.6;font-size:15px;">Hallo ${data.firstName},<br><br>Ihr Termin bei uns steht fest:<br><br><b>Zeit:</b> ${formatted}<br><b>Ort:</b> Industriestraße 22, 93077 Bad Abbach<br><br><a href="${gCalLink}" style="${btnStyle}">Zum Google Kalender hinzufügen</a><br><br>Wir freuen uns auf Sie!${signaturHtml}</div>`
    },
    uk: { 
      subject: 'Ваш запис підтверджено – AlexGruppee', 
      body: `Вітаємо, ${data.firstName}!\n\nВаш запис успішно підтверджено:\n\nЧас: ${formatted}\nАдреса: Industriestraße 22, 93077 Bad Abbach\n\nДодати в Google Календар:\n${gCalLink}\n\nДо зустрічі!\n\nAlexGruppee...`,
      htmlBody: `<div style="font-family:sans-serif;color:#333;line-height:1.6;font-size:15px;">Вітаємо, ${data.firstName}!<br><br>Ваш запис успішно підтверджено:<br><br><b>Час:</b> ${formatted}<br><b>Адреса:</b> Industriestraße 22, 93077 Bad Abbach<br><br><a href="${gCalLink}" style="${btnStyle}">Додати в Google Календар</a><br><br>До зустрічі!${signaturHtml}</div>`
    },
    ru: { 
      subject: 'Ваша запись подтверждена – AlexGruppee', 
      body: `Здравствуйте, ${data.firstName}!\n\nВаша запись успешно подтверждена:\n\nВремя: ${formatted}\nАдрес: Industriestraße 22, 93077 Bad Abbach\n\nДобавить в Google Календарь:\n${gCalLink}\n\nДо встречи!\n\nAlexGruppee...`,
      htmlBody: `<div style="font-family:sans-serif;color:#333;line-height:1.6;font-size:15px;">Здравствуйте, ${data.firstName}!<br><br>Ваша запись успешно подтверждена:<br><br><b>Время:</b> ${formatted}<br><b>Адрес:</b> Industriestraße 22, 93077 Bad Abbach<br><br><a href="${gCalLink}" style="${btnStyle}">Добавить в Google Календарь</a><br><br>До встречи!${signaturHtml}</div>`
    },
    en: { 
      subject: 'Your appointment is confirmed – AlexGruppee', 
      body: `Hello ${data.firstName},\n\nYour appointment is confirmed:\n\nTime: ${formatted}\nLocation: Industriestraße 22, 93077 Bad Abbach\n\nAdd to Google Calendar:\n${gCalLink}\n\nLooking forward to seeing you!\n\nAlexGruppee...`,
      htmlBody: `<div style="font-family:sans-serif;color:#333;line-height:1.6;font-size:15px;">Hello ${data.firstName},<br><br>Your appointment is confirmed:<br><br><b>Time:</b> ${formatted}<br><b>Location:</b> Industriestraße 22, 93077 Bad Abbach<br><br><a href="${gCalLink}" style="${btnStyle}">Add to Google Calendar</a><br><br>Looking forward to seeing you!${signaturHtml}</div>`
    }
  };
  const t = templates[data.language] || templates.de;
  if (data.email) {
    GmailApp.sendEmail(data.email, t.subject, t.body, { 
      name: 'AlexGruppee',
      htmlBody: t.htmlBody
    });
  }
}

function sendOwnerNotification(data, row) {
  const webAppUrl = ScriptApp.getService().getUrl();
  const confirmUrl = webAppUrl + '?action=confirm&id=' + row + '&source=' + data.source;
  const subject = '[NEUE ANFRAGE] ' + data.source + ': ' + data.firstName + ' ' + data.lastName;
  
  const bodyText = `Neue Anfrage #${row}\n\nKunde: ${data.firstName} ${data.lastName}\nE-Mail: ${data.email}\nTelefon: ${data.phone}\nThema: ${data.topic}\nWunschtermin: ${data.prefDate} (${data.prefTime})\nSprache: ${data.language}\n\nLINK:\n${confirmUrl}`;
  
  const cleanPhone = (data.phone || "").replace(/[^0-9]/g, '');
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hallo ' + data.firstName + ', hier ist AlexGruppee. Danke für Ihre Anfrage zu ' + data.topic + '!')}` : '#';
  
  const btnStyle = 'display:inline-block;padding:14px 28px;background-color:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;margin:10px 10px 10px 0;font-family:sans-serif;font-size:16px;box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);';
  const waBtnStyle = 'display:inline-block;padding:14px 28px;background-color:#25D366;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;margin:10px 0;font-family:sans-serif;font-size:16px;box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);';
  
  const htmlBody = `
    <div style="font-family:sans-serif;color:#1e293b;max-width:600px;margin:20px auto;border:1px solid #e2e8f0;border-radius:12px;padding:32px;background:#ffffff;box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
      <h2 style="margin-top:0;color:#0f172a;border-bottom:2px solid #f1f5f9;padding-bottom:16px;font-size:22px;">Neue Buchungsanfrage</h2>
      <p style="font-size:15px;color:#475569;line-height:1.5;">Sie haben eine neue Anfrage über die Website (<b>${data.source}</b>) erhalten.</p>
      
      <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:15px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;width:140px;color:#64748b;">Kunde:</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:bold;font-size:16px;">${data.firstName} ${data.lastName}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">E-Mail:</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><a href="mailto:${data.email}" style="color:#2563eb;text-decoration:none;">${data.email}</a></td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Telefon:</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><a href="tel:${data.phone}" style="color:#2563eb;text-decoration:none;">${data.phone}</a></td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Kontaktweg:</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">${data.contactPref}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Sprache:</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;"><b>${String(data.language).toUpperCase()}</b></td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Thema:</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#0f172a;">${data.topic}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;">Wunschtermin:</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:bold;color:#b91c1c;">${data.prefDate} (Fenster: ${data.prefTime})</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;vertical-align:top;">Nachricht:</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-style:italic;color:#475569;">${data.message || '- Keine Nachricht hinterlassen -'}</td></tr>
      </table>
      
      <div style="text-align:center;margin-top:20px;">
        <a href="${waLink}" style="${waBtnStyle}">WhatsApp Chat öffnen</a><br>
        <a href="${confirmUrl}" style="${btnStyle}">Status aktualisieren (CRM)</a>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin-bottom:0;text-align:center;margin-top:20px;">Automatisches AlexGruppee CRM System</p>
    </div>
  `;

  GmailApp.sendEmail(OWNER_EMAIL, subject, bodyText, { 
    name: 'AlexGruppee CRM',
    htmlBody: htmlBody
  });
}

function manualSyncClientsAuto() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rows = ss.getSheetByName(SHEET_ZAYAVKI_AUTO).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const data = { firstName: rows[i][1], lastName: rows[i][2], email: rows[i][3], phone: rows[i][4], source: 'Auto' };
    if (data.email || data.phone) syncClient(data);
  }
}

function manualSyncClientsBau() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rows = ss.getSheetByName(SHEET_ZAYAVKI_BAU).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const data = { firstName: rows[i][1], lastName: rows[i][2], email: rows[i][3], phone: rows[i][4], source: 'Bau' };
    if (data.email || data.phone) syncClient(data);
  }
}

function createCalendarEvent(data) {
  try {
    const cal = CalendarApp.getCalendarById(CALENDAR_ID);
    let timeStr = '08:00:00';
    if (data.prefTime && data.prefTime !== 'any') {
      timeStr = data.prefTime.split('-')[0] + ':00:00';
    }
    const start = new Date(data.prefDate + 'T' + timeStr);
    const end = new Date(start.getTime() + 60 * 60 * 1000); 
    const event = cal.createEvent('AlexGruppee REQUEST: ' + data.firstName + ' ' + data.lastName, start, end, {
      description: 'Phone: ' + data.phone + '\nEmail: ' + data.email + '\nTopic: ' + data.topic,
      location: data.source === 'Auto' ? 'Industriestr. 22, 93077 Bad Abbach' : ''
    });
    if (data.source === 'Bau') event.setColor(CalendarApp.EventColor.ORANGE);
    else event.setColor(CalendarApp.EventColor.BLUE);
    
    return event.getId();
  } catch (err) {
    console.error("Calendar create error: " + err);
    return "";
  }
}
// update
