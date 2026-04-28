/**
 * AlexGruppee — Booking System Handler
 * Handles form submission to Google Apps Script (GAS).
 */

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyvRINsLOaXopVX9vns-bLzcAEBoXMJp7SLSc_v7udnk0GDa8mzcoUCvFsNVJcLWwXbWA/exec';

window.handleBookingSubmit = async function (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    
    // Set loading state
    submitBtn.disabled = true;
    submitBtn.textContent = '...'; // Or a localized spinner text
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Add current language and source (Auto/Bau)
    data.language = localStorage.getItem('ag-lang') || 'de';
    data.source = form.id.includes('Auto') ? 'Auto' : 'Bau';
    data.timestamp = new Date().toISOString();

    try {
        console.log('Sending booking data to GAS:', data);

        // We use URLSearchParams to create a 'simple request' that avoids CORS preflight issues
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Essential for GAS to avoid preflight errors from simple static sites
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // GAS handles this as a postData blob
            },
            body: JSON.stringify(data)
        });

        // With no-cors, we won't see the response content, but if it reaches this line, 
        // the browser at least successfully sent the packet.
        console.log('Booking submitted successfully (no-cors mode)');
        showSuccessMessage(form, data.language);

    } catch (error) {
        console.error('Booking submission CRITICAL ERROR:', error);
        alert('Ошибка при отправке. Пожалуйста, проверьте консоль браузера (F12) или свяжитесь с нами напрямую.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
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
