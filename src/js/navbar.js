export function updateLine(buttonElement) {
    const line = document.querySelector('.navbar .line');

    line.style.setProperty('--x', `${buttonElement.offsetLeft}px`);
    line.style.setProperty('--width', `${buttonElement.offsetWidth}px`);
}

export function loadNavbar() {
    const buttonsElement = document.querySelector('.navbar .buttons');
    const activeButton = buttonsElement.querySelector('.active');

    if (activeButton) updateLine(activeButton);

    buttonsElement.addEventListener('click', (event) => {
        const buttonElement = event.target.closest('.button');

        if (!buttonElement) return;

        const oldActiveButton = buttonsElement.querySelector('.active');

        if (oldActiveButton) {
            if (oldActiveButton === buttonElement) return;

            oldActiveButton.classList.remove('active');
        }

        buttonElement.classList.add('active');

        updateLine(buttonElement);
    });
}