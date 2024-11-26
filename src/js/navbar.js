export function updateLine(buttonElement) {
    const line = document.querySelector('.navbar .line');

    line.style.setProperty('--x', `${Math.round(buttonElement.offsetLeft)}px`);
    line.style.setProperty('--width', `${Math.round(buttonElement.offsetWidth)}px`);
}

export function loadNavbar() {
    const buttonsElement = document.querySelector('.navbar .buttons');
    const activeButton = buttonsElement.querySelector('.active');

    if (activeButton) updateLine(activeButton);

    buttonsElement.addEventListener('click', (event) => {
        const buttonElement = event.target.closest('.button');

        if (!buttonElement) return;

        const oldActiveButton = buttonsElement.querySelector('.active');

        if (oldActiveButton) oldActiveButton.classList.remove('active');

        buttonElement.classList.add('active');

        updateLine(buttonElement);
    });
}