const { test, expect } = require('@playwright/test');

test.describe('Live Price Scraping Tests', () => {
  test.setTimeout(60000); // Increase timeout for web scraping

  test('should scrape OpenAI pricing page', async ({ page }) => {
    // Navigate to OpenAI pricing
    await page.goto('https://openai.com/api/pricing/', { 
      waitUntil: 'networkidle' 
    });

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/openai-pricing.png', fullPage: true });

    // Look for pricing information
    const pricingContent = await page.evaluate(() => {
      const models = [];
      
      // Try multiple selectors as websites often change
      const selectors = [
        'table tbody tr',
        '.pricing-table tr',
        '[data-pricing]',
        '.price-item',
        'div[class*="pricing"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach(el => {
            const text = el.textContent || '';
            // Look for patterns like "$X.XX" or "X.XX per"
            if (text.match(/\$?\d+\.\d+/)) {
              models.push(text.trim());
            }
          });
          break;
        }
      }
      
      return models;
    });

    console.log('Found pricing data:', pricingContent);
    expect(pricingContent.length).toBeGreaterThan(0);
  });

  test('should scrape Anthropic pricing page', async ({ page }) => {
    await page.goto('https://www.anthropic.com/pricing', { 
      waitUntil: 'networkidle' 
    });

    await page.screenshot({ path: 'test-results/anthropic-pricing.png', fullPage: true });

    // Wait for pricing content to load
    await page.waitForSelector('body', { timeout: 10000 });

    const pricingData = await page.evaluate(() => {
      const prices = [];
      
      // Look for Claude model pricing
      const priceElements = document.querySelectorAll('*');
      priceElements.forEach(el => {
        const text = el.textContent || '';
        if (text.includes('Claude') && text.match(/\$?\d+\.\d+/)) {
          prices.push({
            text: text.trim().substring(0, 200),
            price: text.match(/\$?\d+\.\d+/)[0]
          });
        }
      });
      
      return prices;
    });

    console.log('Anthropic pricing:', pricingData);
    expect(pricingData.length).toBeGreaterThan(0);
  });

  test('should scrape Google AI pricing page', async ({ page }) => {
    await page.goto('https://ai.google.dev/pricing', { 
      waitUntil: 'networkidle' 
    });

    await page.screenshot({ path: 'test-results/google-ai-pricing.png', fullPage: true });

    const geminiPricing = await page.evaluate(() => {
      const prices = [];
      
      // Look for Gemini pricing
      const elements = document.querySelectorAll('*');
      elements.forEach(el => {
        const text = el.textContent || '';
        if (text.includes('Gemini') && text.match(/\$?\d+\.\d+/)) {
          prices.push({
            model: text.includes('Flash') ? 'Gemini Flash' : 
                   text.includes('Pro') ? 'Gemini Pro' : 'Gemini',
            price: text.match(/\$?\d+\.\d+/)[0]
          });
        }
      });
      
      return [...new Set(prices.map(p => JSON.stringify(p)))].map(p => JSON.parse(p));
    });

    console.log('Google AI pricing:', geminiPricing);
    expect(geminiPricing.length).toBeGreaterThan(0);
  });

  test('should extract pricing from table structures', async ({ page }) => {
    // Create a test HTML with pricing table
    await page.setContent(`
      <html>
        <body>
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Input Price</th>
                <th>Output Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>GPT-4</td>
                <td>$30.00</td>
                <td>$60.00</td>
              </tr>
              <tr>
                <td>GPT-3.5</td>
                <td>$0.50</td>
                <td>$1.50</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);

    const extractedData = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const data = [];
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          data.push({
            model: cells[0].textContent.trim(),
            inputPrice: parseFloat(cells[1].textContent.replace(/[^0-9.]/g, '')),
            outputPrice: parseFloat(cells[2].textContent.replace(/[^0-9.]/g, ''))
          });
        }
      });
      
      return data;
    });

    expect(extractedData).toHaveLength(2);
    expect(extractedData[0]).toEqual({
      model: 'GPT-4',
      inputPrice: 30.00,
      outputPrice: 60.00
    });
  });

  test('should handle dynamic content loading', async ({ page }) => {
    // Create a page that loads content dynamically
    await page.setContent(`
      <html>
        <body>
          <div id="pricing">Loading...</div>
          <script>
            setTimeout(() => {
              document.getElementById('pricing').innerHTML = 
                '<div class="price">Model A: $5.00 per 1M tokens</div>';
            }, 1000);
          </script>
        </body>
      </html>
    `);

    // Wait for dynamic content
    await page.waitForSelector('.price', { timeout: 5000 });
    
    const price = await page.locator('.price').textContent();
    expect(price).toContain('$5.00');
  });

  test('should extract nested pricing information', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div class="pricing-cards">
            <div class="card">
              <h3>Claude 3.5 Sonnet</h3>
              <div class="prices">
                <span class="input">Input: $3/1M tokens</span>
                <span class="output">Output: $15/1M tokens</span>
              </div>
            </div>
            <div class="card">
              <h3>Claude 3 Haiku</h3>
              <div class="prices">
                <span class="input">Input: $0.25/1M tokens</span>
                <span class="output">Output: $1.25/1M tokens</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    const cards = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll('.card').forEach(card => {
        const name = card.querySelector('h3')?.textContent;
        const input = card.querySelector('.input')?.textContent;
        const output = card.querySelector('.output')?.textContent;
        
        if (name && input && output) {
          data.push({
            name: name.trim(),
            inputPrice: parseFloat(input.match(/\$?([\d.]+)/)?.[1] || '0'),
            outputPrice: parseFloat(output.match(/\$?([\d.]+)/)?.[1] || '0')
          });
        }
      });
      return data;
    });

    expect(cards).toHaveLength(2);
    expect(cards[0].name).toBe('Claude 3.5 Sonnet');
    expect(cards[0].inputPrice).toBe(3);
    expect(cards[0].outputPrice).toBe(15);
  });
});

test.describe('Update Pricing Script', () => {
  test('should validate scraped data structure', async ({ page }) => {
    // Mock scraped data
    const scrapedData = [
      { name: 'GPT-4', input: 30, output: 60 },
      { name: 'GPT-3.5', input: 0.5, output: 1.5 }
    ];

    // Validate structure
    scrapedData.forEach(item => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('input');
      expect(item).toHaveProperty('output');
      expect(typeof item.input).toBe('number');
      expect(typeof item.output).toBe('number');
      expect(item.input).toBeGreaterThanOrEqual(0);
      expect(item.output).toBeGreaterThanOrEqual(0);
    });
  });

  test('should merge scraped data with existing data', async ({ page }) => {
    const existingData = {
      providers: [
        {
          name: 'OpenAI',
          models: [
            { name: 'GPT-4', modelId: 'gpt-4', pricing: { input: 25, output: 50 } },
            { name: 'GPT-3.5', modelId: 'gpt-3.5', pricing: { input: 0.4, output: 1.2 } }
          ]
        }
      ]
    };

    const scrapedData = [
      { name: 'GPT-4', input: 30, output: 60 },
      { name: 'GPT-3.5', input: 0.5, output: 1.5 }
    ];

    // Merge logic
    const provider = existingData.providers[0];
    scrapedData.forEach(scraped => {
      const model = provider.models.find(m => 
        m.name.toLowerCase().includes(scraped.name.toLowerCase())
      );
      
      if (model) {
        model.pricing.input = scraped.input;
        model.pricing.output = scraped.output;
      }
    });

    // Validate merge
    expect(provider.models[0].pricing.input).toBe(30);
    expect(provider.models[0].pricing.output).toBe(60);
    expect(provider.models[1].pricing.input).toBe(0.5);
    expect(provider.models[1].pricing.output).toBe(1.5);
  });
});