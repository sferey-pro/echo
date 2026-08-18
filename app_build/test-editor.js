import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173'); // Assuming Vite default port
  
  // Wait for the app to load
  await page.waitForTimeout(2000);
  
  // Try to find the scenario in the sidebar
  // ... well, let's just use playwright to check if there are errors in console.
  
  await browser.close();
})();
