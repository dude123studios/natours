import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
    try {
        const res = await axios({
            method: 'POST',
            url: '/api/v1/users/login',
            data: {
                email,
                password,
            },
        });

        if (res.data.status === 'success') {
            showAlert('success', 'Logged in succesfully');
            window.setTimeout(() => {
                location.assign('/');
            }, 500);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};

export const logout = async () => {
    try {
        const res = await axios({
            method: 'DELETE',
            url: '/api/v1/users/login',
        });
        if (res.data.status === 'success') {
            showAlert('success', 'Logged out succesfully');
        }
        location.reload(true);
    } catch (err) {
        showAlert('error', 'Error Logging out! Try again later');
    }
};
