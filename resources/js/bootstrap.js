import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// App-shell: verlopen sessie, terugkeer na lange tijd, hoogte van de kopbalk (zie shell.js).
import './shell';
