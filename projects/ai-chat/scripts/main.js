const messageHistory = [{
    role: 'user',
    content: ''
}, {
    role: 'assistant',
    content: 'Olá, eu sou GPT, quem é você?'
}];

let selectedModel = null;

function getMessageHistory() {
    return messageHistory;
}

function getApiURL() {
    return 'https://ai-server-qfeb.onrender.com';
}

function getLogsApiURL() {
    return 'https://www.piway.com.br/unoesc/api';
}

const remoteApiURL = getLogsApiURL();
const matricula = '450770';

async function getRemoteLogs() {
    const res = await fetch(remoteApiURL + '/logs/' + matricula);
    const data = await res.json();
    return data;
}

async function addRemoteLog(url, method, data) {
    if (typeof data === 'object') data = JSON.stringify(data, 4, 4);
    const res = await fetch(remoteApiURL + '/inserir/log/' + matricula + '/generativelanguage.googleapis.com/' + method + '/' + encodeURIComponent(data));
    const result = await res.json();
    updateLocalLogs();
    return result;
}

async function deleteRemoteLog(logId) {
    const res = await fetch(remoteApiURL + '/excluir/log/' + logId + '/aluno/' + matricula);
    const data = await res.json();
    updateLocalLogs();
    return data;
}

function getLocalLogElementById(logId) {
    return document.querySelector(`.log[data-id="${logId}"]`);
}

function createLocalLogElement(log) {
    const logElement = document.createElement('div');

    logElement.className = 'log';

    logElement.dataset.id = log.idlog;

    logElement.innerHTML = `
        <span class="date">${sanitize(log.log)}</span>
        <span class="text">${sanitize(log.resultado)}</span>
        <button class="delete-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-trash2-icon lucide-trash-2">
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
        </button>
    `;

    return logElement;
}

async function updateLocalLogs() {
    const logs = await getRemoteLogs();

    const logsContainer = document.querySelector('.logs-scroller');

    for (const log of logs) {
        const existingLogElement = getLocalLogElementById(log.idlog);
        if (existingLogElement) continue;

        const newLogElement = createLocalLogElement(log);
        logsContainer.appendChild(newLogElement);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
}

function setupEvents() {
    const sendButton = document.querySelector('.send-button');

    sendButton.addEventListener('click', onClickSend);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onClickSend();
        }
    });

    const modelSelect = document.querySelector('select[name="model-select"]');

    modelSelect.addEventListener('change', onModelChange);

    const logsContainer = document.querySelector('.logs-scroller');

    logsContainer.addEventListener('click', ({ target }) => {
        const deleteButton = target.closest('.delete-button');
        if (!deleteButton) return;

        const logElement = deleteButton.closest('.log');
        if (!logElement) return;

        const logId = logElement.dataset.id;
        if (!logId) return;

        const ok =true// confirm('Tem certeza que deseja remover este log?');

        if (ok) {
            deleteRemoteLog(logId);
            logElement.remove();
        }
    });
}

function onModelChange(event) {
    selectedModel = event.target.value;
}

function getInputElement() {
    return document.querySelector('input[name="message"]');
}

function getInputValue() {
    const inputField = getInputElement();
    return inputField.value.trim();
}

function setInputValue(value) {
    const inputField = getInputElement();
    inputField.value = value;
}

function sanitize(content) {
    const tempDiv = document.createElement('div');
    tempDiv.textContent = content;
    return tempDiv.innerHTML;
}

function addLocalMessage(message) {
    if (!message.content) return;

    const messagesContainer = document.querySelector('.messages');

    const messageElement = document.createElement('div');

    messageElement.classList.add('message', message.role);

    messageElement.innerHTML = /*html*/`
        <span class="content">
            ${sanitize(message.content)}
        </span>
    `;

    messagesContainer.appendChild(messageElement);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return {
        getElement() {
            return messageElement;
        },
        remove() {
            messagesContainer.removeChild(messageElement);
        }
    };
}

function onClickSend() {
    const message = getInputValue();
    if (!message) return;

    sendUserMessage(message);
    setInputValue('');
}

async function sendUserMessage(message) {
    const messageHistory = getMessageHistory();

    const userMessage = {
        role: 'user',
        content: message
    };

    const addedUserMessage = addLocalMessage(userMessage);

    messageHistory.push(userMessage);

    setAssistantTyping(true);

    try {
        const apiURL = getApiURL();
        const reqURL = apiURL + '/api/messages';

        const response = await fetch(reqURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: messageHistory
            })
        });

        const assistantMessage = await response.json();

        addRemoteLog(reqURL, 'POST', assistantMessage);

        addLocalMessage(assistantMessage);

        messageHistory.push(assistantMessage);

        setAssistantTyping(false);
    } catch (error) {
        addedUserMessage.remove();

        const index = messageHistory.indexOf(userMessage);

        if (index > -1) {
            messageHistory.splice(index, 1);
        }

        setAssistantTyping(false);

        console.error('Error sending message:', error);

        alert('Erro ao enviar mensagem. Por favor, tente novamente.');
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function checkServerAvailability() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
        const apiURL = getApiURL();
        const reqURL = apiURL + '/api/status';

        const response = await fetch(reqURL, {
            signal: controller.signal
        });

        clearTimeout(timeout);

        const data = await response.json();
        const { status } = data;

        addRemoteLog(reqURL, 'GET', data);

        if (status !== 'ok') {
            throw new Error('Server is not available');
        }

        console.log('Server is available!');

        document.body.classList.remove('loading');
    } catch (error) {
        clearTimeout(timeout);

        const loadingScreen = document.querySelector('.loading-screen');
        loadingScreen.classList.add('show');

        console.warn('Server not available, retrying in 1 second...');

        await sleep(1000);
        await checkServerAvailability();
    }
}

function setAssistantTyping(isTyping) {
    const typingIndicator = document.querySelector('.typing-indicator');
    typingIndicator.classList.toggle('visible', isTyping);
}

function setLocalModels(models) {
    const modelsContainer = document.querySelector('select[name="model-select"]');

    modelsContainer.innerHTML = '';

    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const optionElement = document.createElement('option');

        optionElement.value = model;
        optionElement.textContent = model;

        if (i === 0) {
            optionElement.selected = true;
            selectedModel = model;
        }

        modelsContainer.appendChild(optionElement);
    }
}

async function fetchAvailableModels() {
    try {
        const apiURL = getApiURL();
        const reqURL = apiURL + '/api/models';

        const response = await fetch(reqURL);
        const data = await response.json();
        const { models } = data;

        addRemoteLog(reqURL, 'GET', data);

        setLocalModels(models);
    } catch (error) {
        console.error('Error fetching models:', error);

        alert('Erro ao buscar modelos disponíveis. Por favor, tente novamente.');
    }
}

async function main() {
    await checkServerAvailability();

    fetchAvailableModels();

    for (const message of messageHistory) {
        addLocalMessage(message);
    }

    setupEvents();
}

main();
