/**
 * AlexGruppee — Booking System Handler
 * Handles form submission to Google Apps Script (GAS).
 */

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyvRINsLOaXopVX9vns-bLzcAEBoXMJp7SLSc_v7udnk0GDa8mzcoUCvFsNVJcLWwXbWA/exec';
const GAS_REQUEST_TIMEOUT_MS = 10000;

const ERROR_MESSAGES = {
    de: 'Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
    en: 'There was a problem sending your request. Please try again or contact us directly.',
    uk: 'Не вдалося надіслати запит. Будь ласка, спробуйте ще раз або зв’яжіться з нами напряму.',
    ru: 'Не удалось отправить запрос. Пожалуйста, попробуйте ещё раз или свяжитесь с нами напрямую.'
};

// Stamp the form with a load-time so we can spot bots that submit instantly.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form[id^="bookingForm"]').forEach(form => {
        form.dataset.loadedAt = String(Date.now());
    });
});

window.handleBookingSubmit = async function (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.language = localStorage.getItem('ag-lang') || 'de';
    data.source = form.id.includes('Auto') ? 'Auto' : 'Bau';
    data.timestamp = new Date().toISOString();
    // Anti-spam: how long the form was on screen before submit. Server rejects sub-3s submissions.
    const loadedAt = Number(form.dataset.loadedAt);
    data.fillTime = Number.isFinite(loadedAt) && loadedAt > 0 ? Date.now() - loadedAt : null;
    // Honeypot: `website` is a hidden input that must stay empty.
    data.website = formData.get('website') || '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GAS_REQUEST_TIMEOUT_MS);

    try {
        // GAS Web App rejects CORS preflight, so we send a "simple request" with text/plain.
        // mode:'no-cors' makes the response opaque — we treat any non-thrown fetch as delivered.
        await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        showSuccessMessage(form, data.language);
    } catch (error) {
        console.error('Booking submission failed:', error);
        const lang = data.language;
        const msg = ERROR_MESSAGES[lang] || ERROR_MESSAGES.de;
        alert(msg);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    } finally {
        clearTimeout(timeoutId);
    }
};

function showSuccessMessage(form, lang) {
    const card = form.closest('.contact-form-card');
    if (!card) return;

    // Hide the card's intro heading and description
    const cardTitle = card.querySelector('h3');
    const cardDesc = card.querySelector('p');
    if (cardTitle) cardTitle.style.display = 'none';
    if (cardDesc) cardDesc.style.display = 'none';

    form.style.display = 'none';

    const successDiv = document.createElement('div');
    successDiv.style.cssText = 'text-align:center; padding: 3rem 1rem;';
    
    // Localized success messages
    const msgs = {
        de: { title: 'Anfrage gesendet!', text: 'Vielen Dank. Wir haben Ihre Anfrage erhalten und melden uns in Kürze bei Ihnen.' },
        en: { title: 'Request Sent!', text: 'Thank you. We have received your request and will contact you shortly.' },
        uk: { title: 'Запит надіслано!', text: 'Дякуємо. Ми отримали ваш запит і скоро зв’яжемося з вами.' },
        ru: { title: 'Запрос отправлен!', text: 'Спасибо. Мы получили ваш запрос и скоро свяжемся с вами.' }
    };
    
    const msg = msgs[lang] || msgs.de;

    successDiv.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
        <h3 style="margin-bottom: 0.75rem; font-size: 1.4rem;">${msg.title}</h3>
        <p style="opacity: 0.6; font-size: 0.95rem; line-height: 1.6;">${msg.text}</p>
    `;
    card.appendChild(successDiv);

    setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}
