import { test, expect } from 'bun:test';
import { render } from '@testing-library/react';
import App from './App';

test('l\'application se monte sans erreur', () => {
  render(<App />);
  // Vérifie simplement que le DOM est généré sans plantage initial
  expect(document.body.innerHTML).not.toBe('');
});
