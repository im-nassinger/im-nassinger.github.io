import { proxy } from 'valtio';

export const navbarState = proxy({
    buttonsHidden: false,
    activeButton: ''
});

export const setButtonsHidden = (hidden: boolean) => navbarState.buttonsHidden = hidden;