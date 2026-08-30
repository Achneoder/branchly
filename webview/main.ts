import { mount } from 'svelte';
import './lib/tokens.css';
import './lib/theme.css';
import App from './App.svelte';

const target = document.getElementById('app');
if (target) {
  mount(App, { target });
}
