import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders app without crashing', () => {
  const { container } = render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  // App should render without throwing and produce DOM elements
  const stack = container.querySelector('div[class*="MuiStack"]');
  expect(stack).toBeInTheDocument();
});
