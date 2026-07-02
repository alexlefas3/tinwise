document.addEventListener('DOMContentLoaded', function () {

  let host = "https://tinwise.ngnc.gr:8902/chat";
  //let host = "http://89.167.77.251/tinwise/lib/chat_proxy.php";
  //let host = "http://192.168.0.200:8902/chat"; // manually get host from config.php
  let inactiveMessage = "Server is down, Please contact the developer to activate it";
  let userType = null; 
  let lastBotReply = null;
  let passwordInput = false;
  let lang = "en";

  const textarea = document.getElementById('chat-input');
  const charCount = document.getElementById('char-count');
  const sendBtn = document.getElementById('send-btn');
  const chatArea = document.getElementById('chat-area');
  const welcomeSection = document.getElementById('welcome-section');
  const promptClinician = document.getElementById('prompt-clinician');
  const promptPatient = document.getElementById('prompt-patient');

  textarea.disabled = true;

  promptClinician.addEventListener('click', () => selectRole("c"));
  promptPatient.addEventListener('click', () => selectRole("p"));

  function selectRole(role) {
    userType = role;
    textarea.disabled = false;
    textarea.focus();

    if (welcomeSection) welcomeSection.style.display = 'none';
    chatArea.classList.remove('hidden');
    chatArea.classList.add('flex');

    greetUser(role === "c" ? "clinician" : "patient");
  }

function changeLanguage(newLang) {
  lang = newLang;

  // Update welcome section text based on language
  const welcomeSection = document.getElementById('welcome-section');
  if (!welcomeSection) return;

  if (lang === 'de') {
    welcomeSection.querySelector('h1').innerHTML = 'Willkommen,';
    welcomeSection.querySelectorAll('h1')[1].innerHTML = 'Ich bin der TinWise Chatbot';
    welcomeSection.querySelector('p').innerHTML = 'Wählen Sie eine Rolle, um mit dem Chat zu beginnen';
    document.getElementById('prompt-clinician').innerHTML = 'Ich bin ein Arzt' + welcomeSection.querySelector('#prompt-clinician svg').outerHTML;
    document.getElementById('prompt-patient').innerHTML = 'Ich bin ein Patient' + welcomeSection.querySelector('#prompt-patient svg').outerHTML;
    document.getElementById('chat-input').placeholder = 'Geben Sie Ihre Nachricht hier ein...';
  } else if (lang === 'el') {
    welcomeSection.querySelector('h1').innerHTML = 'Καλώς ήρθατε,';
    welcomeSection.querySelectorAll('h1')[1].innerHTML = 'Είμαι το TinWise Chatbot';
    welcomeSection.querySelector('p').innerHTML = 'Επιλέξτε ρόλο για να ξεκινήσετε τη συνομιλία';
    document.getElementById('prompt-clinician').innerHTML = 'Είμαι γιατρός' + welcomeSection.querySelector('#prompt-clinician svg').outerHTML;
    document.getElementById('prompt-patient').innerHTML = 'Είμαι ασθενής' + welcomeSection.querySelector('#prompt-patient svg').outerHTML;
    document.getElementById('chat-input').placeholder = 'Πληκτρολογήστε το μήνυμά σας εδώ...';
  } else {
    welcomeSection.querySelector('h1').innerHTML = 'Welcome,';
    welcomeSection.querySelectorAll('h1')[1].innerHTML = 'I am TinWise chatbot';
    welcomeSection.querySelector('p').innerHTML = 'Select a role to begin chatting';
    document.getElementById('prompt-clinician').innerHTML = 'I am a clinician' + welcomeSection.querySelector('#prompt-clinician svg').outerHTML;
    document.getElementById('prompt-patient').innerHTML = 'I am a patient' + welcomeSection.querySelector('#prompt-patient svg').outerHTML;
    document.getElementById('chat-input').placeholder = 'Type your question here...';
  }
}

function greetUser(role) {
  if (lang === 'de') {
    addBotBubble(`Hallo ${translateRole(role)}, was möchten Sie über Tinnitus wissen?`);
  } else if (lang === 'el') {
    addBotBubble(`Γεια σας ${translateRole(role)}, τι θα θέλατε να μάθετε για τις εμβοές;`);
  } else {
    addBotBubble(`Hello ${role}, what would you like to know about tinnitus?`);
  }
}

function translateRole(role) {
  if (lang === 'de') {
    return role === "clinician" ? "Arzt" : "Patient";
  } else if (lang === 'el') {
    return role === "clinician" ? "γιατρέ" : "ασθενή";
  } else {
    return role;
  }
}

  textarea.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';

    if (this.value.length > 4000) {
      this.value = this.value.slice(0, 4000);
    }
    charCount.textContent = `${this.value.length}/4000`;
  });

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  function sendMessage() {
    if (textarea.disabled) return;

    const msg = textarea.value.trim();
    if (!msg) return;

    setUserResponse(msg);
    textarea.value = '';
    textarea.style.height = 'auto';
    charCount.textContent = '0/4000';

    showThinkingGif();
    sendToServer(msg);
  }

  function setUserResponse(message) {
    const display = passwordInput ? "******" : message;
    const userBubble = `
      <div class="self-end bg-blue-500 text-white rounded-2xl px-4 py-2 max-w-[70%] shadow">
        ${display}
      </div>`;
    chatArea.insertAdjacentHTML('beforeend', userBubble);
    passwordInput = false;
    scrollToBottom();
  }

  function addBotBubble(html) {
    const botBubble = `
      <div class="self-start bg-neutral-100 text-neutral-800 rounded-2xl px-4 py-2 max-w-[70%] shadow">
        ${html}
      </div>`;
    chatArea.insertAdjacentHTML('beforeend', botBubble);
    scrollToBottom();
  }

  function showThinkingGif() {
    removeThinkingGif();
    const thinking = `
      <div id="thinking-gif" class="self-start">
        <img src="assets/images/thinking.gif" style="height:32px;width:auto;" />
      </div>`;
    chatArea.insertAdjacentHTML('beforeend', thinking);
    scrollToBottom();
  }

  function removeThinkingGif() {
    const gif = document.getElementById('thinking-gif');
    if (gif) gif.remove();
  }

  function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }


  async function sendToServer(message) {
    try {
      const payload = { message };
      if (lastBotReply) payload.previous_answer = lastBotReply;
      if (userType) payload.type = userType;
      payload.lang = lang;
      moodleToken = getCookie("moodle_token");
      
        if (moodleToken) payload.token = moodleToken;
        // else console.warn("Moodle token not found in cookies.");
      const res = await fetch(host, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();
      removeThinkingGif();

      if (!data || !data.reply) {
        addBotBubble("No response from server.");
        lastBotReply = null;
        return;
      }

      renderBotResponse(data.reply);
      lastBotReply = data.reply;

    } catch (err) {
      console.error(err);
      removeThinkingGif();
      addBotBubble("Bot is temporarily overloaded. Please retry shortly");
      lastBotReply = null;
    }
  }

function renderBotResponse(html) {
  html = html.replace(
    /<a\s+href="([^"]+)"[^>]*>.*?<\/a>/gi,
    function(match, url) {
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.replace("www.", "");
        const isHttps = parsed.protocol === "https:";
        const isTinTrac = hostname.includes("tin-trac.med.auth.gr");
        const finalUrl = isTinTrac ? `${url}&lang=${lang}` : url;
        
        if (isHttps) {
          // Use site favicon if available, fallback to moodle.jpg for Moodle links
          let favicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}`;
          if (isTinTrac) {
            favicon = "assets/images/moodle.jpg";
          }
          return `
            <div class="link-preview" style="margin:8px 0;">
              <a href="${finalUrl}" target="_blank" rel="noopener">
                <div class="link-preview-inner" style="display:flex;align-items:center;">
                  <img 
                    src="${favicon}"
                    alt="Site"
                    style="margin-right:8px;width:24px;height:24px;border-radius:4px;background:#fff;"
                  />
                  <div>
                    <strong>${hostname}</strong><br />

                  </div>
                </div>
              </a>
            </div>
          `;
        } else {
          return `
            <div class="link-preview">
              <a href="${finalUrl}" target="_blank" rel="noopener">🔗 ${url}</a>
            </div>`;
        }
      } catch {
        return match;
      }
    }
  );

  addBotBubble(html);
}
window.changeLanguage = changeLanguage;
});
