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

        const response = await fetch(apiURL + '/api/messages', {
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
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
        const apiURL = getApiURL();
        const response = await fetch(apiURL + '/api/status', {
            signal: controller.signal
        });

        clearTimeout(timeout);

        const { status } = await response.json();

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
        const response = await fetch(apiURL + '/api/models');
        const { models } = await response.json();

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
