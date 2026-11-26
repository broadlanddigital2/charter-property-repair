// Website enquiry form -> Supabase edge function -> SendGrid email to Charter.
(() => {
  const form = document.getElementById('enquiry-form');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';
  const ENDPOINT = 'https://gnnabvwdlpsxmdgvthpi.supabase.co/functions/v1/send-enquiry';
  const status = document.getElementById('form-status');
  const button = form.querySelector('button[type=submit]');
  const label = button ? button.textContent : '';
  const say = (msg, ok) => { status.textContent = msg; status.className = ok ? 'form-ok' : 'form-error'; };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.page = location.pathname;
    button.disabled = true; button.textContent = 'Sending…'; say('', true);
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || 'We couldn’t send your enquiry.');
      form.reset();
      say('Thank you, your enquiry has been sent. The Charter team will be in touch soon.', true);
    } catch (err) {
      say((err && err.message ? err.message : 'We couldn’t send your enquiry.') + ' You can also call 01603 944 080 or email mail@charterpropertyrepairs.co.uk.', false);
    } finally {
      button.disabled = false; button.textContent = label;
    }
  });
})();
