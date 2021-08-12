import { showAlert } from './alerts';
import axios from 'axios';

//Type: 'password' | 'data'
export const updateSettings = async (settings, type) => {
    try {
        const res = await axios({
            method: 'PATCH',
            url: `/api/v1/users/${
                type === 'data' ? 'update-me' : 'update-password'
            }`,
            data: settings,
        });
        if (res.data.status === 'success') {
            showAlert('success', `${type.toUpperCase()} Updated Successfully`);
            //location.reload();
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};
