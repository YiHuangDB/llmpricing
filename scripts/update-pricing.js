const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration for scraping each provider
const SCRAPERS = {
  openai: {
    name: 'OpenAI',
    urls: [
      'https://openai.com/api/pricing/',
      'https://openai.com/pricing'
    ],
    selector: 'table, [class*="price"], [class*="Price"], h2, h3',
    patterns: [
      /GPT-[\d.]+[a-z-]*|o\d+[-\w]*/i,
      /\$?([\d.]+)\s*\/\s*1M\s*(?:input\s*)?tokens/i
    ],
    async scrape(page) {
      const models = [];
      
      try {
        // Wait for content to load
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForTimeout(2000); // Wait for dynamic content
        
        // Extract pricing data
        const extractedData = await page.evaluate(() => {
          const results = [];
          
          // Method 1: Look for table rows
          const tables = document.querySelectorAll('table');
          tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 2) {
                const text = row.textContent || '';
                if (text.includes('$') && text.match(/GPT|o\d+/)) {
                  results.push({
                    raw: text.trim(),
                    type: 'table'
                  });
                }
              }
            });
          });
          
          // Method 2: Look for pricing cards/sections
          const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"]');
          priceElements.forEach(el => {
            const text = el.textContent || '';
            if (text.includes('$') && text.length < 500) {
              results.push({
                raw: text.trim(),
                type: 'price-element'
              });
            }
          });
          
          // Method 3: Search all text nodes for pricing patterns
          const allElements = document.querySelectorAll('*');
          allElements.forEach(el => {
            if (el.children.length === 0) { // Leaf nodes only
              const text = el.textContent || '';
              if (text.includes('$') && text.includes('token') && text.length < 200) {
                results.push({
                  raw: text.trim(),
                  type: 'text-node'
                });
              }
            }
          });
          
          return results;
        });
        
        // Parse extracted data
        const seen = new Set();
        extractedData.forEach(item => {
          // Try to extract model name and prices
          const modelMatch = item.raw.match(/GPT-[\d.]+[a-z-]*|o\d+[-\w]*/i);
          const inputMatch = item.raw.match(/(?:input|Input).*?\$?([\d.]+)/i);
          const outputMatch = item.raw.match(/(?:output|Output).*?\$?([\d.]+)/i);
          
          if (modelMatch && (inputMatch || outputMatch)) {
            const key = `${modelMatch[0]}_${inputMatch?.[1]}_${outputMatch?.[1]}`;
            if (!seen.has(key)) {
              seen.add(key);
              models.push({
                name: modelMatch[0],
                inputPrice: inputMatch ? parseFloat(inputMatch[1]) : null,
                outputPrice: outputMatch ? parseFloat(outputMatch[1]) : null,
                source: item.type
              });
            }
          }
        });
        
      } catch (error) {
        console.error('  Error during scraping:', error.message);
      }
      
      return models;
    }
  },
  
  anthropic: {
    name: 'Anthropic',
    urls: [
      'https://www.anthropic.com/pricing',
      'https://www.anthropic.com/api/pricing'
    ],
    selector: '*',
    async scrape(page) {
      const models = [];
      
      try {
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForTimeout(3000);
        
        const extractedData = await page.evaluate(() => {
          const results = [];
          const elements = document.querySelectorAll('*');
          
          elements.forEach(el => {
            const text = el.textContent || '';
            if (text.includes('Claude') && text.includes('$') && text.length < 500) {
              // Look for Claude model pricing
              if (text.match(/Claude\s+[\d.]+\s+\w+/i)) {
                results.push(text.trim());
              }
            }
          });
          
          return [...new Set(results)]; // Remove duplicates
        });
        
        // Parse Claude pricing
        extractedData.forEach(text => {
          const modelMatch = text.match(/Claude\s+([\d.]+\s+\w+)/i);
          const priceMatches = text.match(/\$?([\d.]+)/g);
          
          if (modelMatch && priceMatches && priceMatches.length >= 2) {
            models.push({
              name: `Claude ${modelMatch[1]}`,
              inputPrice: parseFloat(priceMatches[0].replace('$', '')),
              outputPrice: parseFloat(priceMatches[1].replace('$', '')),
              source: 'web'
            });
          }
        });
        
      } catch (error) {
        console.error('  Error during scraping:', error.message);
      }
      
      return models;
    }
  },
  
  google: {
    name: 'Google AI',
    urls: [
      'https://ai.google.dev/pricing',
      'https://cloud.google.com/vertex-ai/generative-ai/pricing'
    ],
    async scrape(page) {
      const models = [];
      
      try {
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForTimeout(3000);
        
        const extractedData = await page.evaluate(() => {
          const results = [];
          const elements = document.querySelectorAll('*');
          
          elements.forEach(el => {
            const text = el.textContent || '';
            if (text.includes('Gemini') && text.includes('$')) {
              if (text.length < 300) {
                results.push(text.trim());
              }
            }
          });
          
          return [...new Set(results)];
        });
        
        // Parse Gemini pricing
        const seen = new Set();
        extractedData.forEach(text => {
          const modelMatch = text.match(/Gemini\s+([\d.]+\s+\w+)/i);
          const priceMatch = text.match(/\$?([\d.]+)/);
          
          if (modelMatch && priceMatch && !seen.has(modelMatch[1])) {
            seen.add(modelMatch[1]);
            const price = parseFloat(priceMatch[1]);
            models.push({
              name: `Gemini ${modelMatch[1]}`,
              inputPrice: price,
              outputPrice: price * 4, // Estimate
              source: 'web'
            });
          }
        });
        
      } catch (error) {
        console.error('  Error during scraping:', error.message);
      }
      
      return models;
    }
  },
  
  mistral: {
    name: 'Mistral AI',
    urls: [
      'https://mistral.ai/technology/#pricing',
      'https://docs.mistral.ai/platform/pricing/'
    ],
    async scrape(page) {
      const models = [];
      
      try {
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const extractedData = await page.evaluate(() => {
          const results = [];
          const elements = document.querySelectorAll('*');
          
          elements.forEach(el => {
            const text = el.textContent || '';
            if ((text.includes('Mistral') || text.includes('Codestral') || text.includes('Pixtral')) 
                && text.includes('$')) {
              if (text.length < 300) {
                results.push(text.trim());
              }
            }
          });
          
          return [...new Set(results)];
        });
        
        // Parse Mistral pricing
        extractedData.forEach(text => {
          const modelMatch = text.match(/(Mistral|Codestral|Pixtral)\s+(\w+)/i);
          const priceMatches = text.match(/\$?([\d.]+)/g);
          
          if (modelMatch && priceMatches) {
            models.push({
              name: `${modelMatch[1]} ${modelMatch[2]}`,
              inputPrice: parseFloat(priceMatches[0].replace('$', '')),
              outputPrice: priceMatches[1] ? parseFloat(priceMatches[1].replace('$', '')) : parseFloat(priceMatches[0].replace('$', '')) * 3,
              source: 'web'
            });
          }
        });
        
      } catch (error) {
        console.error('  Error during scraping:', error.message);
      }
      
      return models;
    }
  },
  
  cohere: {
    name: 'Cohere',
    urls: [
      'https://cohere.com/pricing',
      'https://docs.cohere.com/docs/pricing'
    ],
    async scrape(page) {
      const models = [];
      
      try {
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const extractedData = await page.evaluate(() => {
          const results = [];
          const elements = document.querySelectorAll('*');
          
          elements.forEach(el => {
            const text = el.textContent || '';
            if (text.includes('Command') && text.includes('$')) {
              if (text.length < 300) {
                results.push(text.trim());
              }
            }
          });
          
          return [...new Set(results)];
        });
        
        // Parse Cohere pricing
        extractedData.forEach(text => {
          const modelMatch = text.match(/Command\s*(R\+|R|Light)?/i);
          const priceMatches = text.match(/\$?([\d.]+)/g);
          
          if (modelMatch && priceMatches) {
            const modelName = modelMatch[1] ? `Command ${modelMatch[1]}` : 'Command';
            models.push({
              name: modelName,
              inputPrice: parseFloat(priceMatches[0].replace('$', '')),
              outputPrice: priceMatches[1] ? parseFloat(priceMatches[1].replace('$', '')) : parseFloat(priceMatches[0].replace('$', '')) * 2,
              source: 'web'
            });
          }
        });
        
      } catch (error) {
        console.error('  Error during scraping:', error.message);
      }
      
      return models;
    }
  }
};

// API-based fetchers (optional, when API keys are available)
const API_FETCHERS = {
  async fetchWithAPI(provider, apiKey) {
    // Placeholder for API-based fetching
    // Can be implemented when official pricing APIs become available
    return null;
  }
};

async function updatePricingData() {
  console.log('Starting automated pricing update...');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  const results = {
    success: [],
    failed: [],
    changes: []
  };
  
  // Load existing data
  const dataPath = path.join(__dirname, '..', 'data', 'llm-pricing.json');
  let existingData;
  
  try {
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    existingData = JSON.parse(fileContent);
    console.log(`Loaded existing data: ${existingData.providers.length} providers\n`);
  } catch (error) {
    console.error('Error loading existing data:', error);
    process.exit(1);
  }
  
  // Check which providers to update
  const providersToUpdate = process.env.PROVIDERS === 'all' 
    ? Object.keys(SCRAPERS)
    : process.env.PROVIDERS?.split(',').map(p => p.trim().toLowerCase()) || Object.keys(SCRAPERS);
  
  console.log(`Updating providers: ${providersToUpdate.join(', ')}\n`);
  
  // Launch browser
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });
  
  try {
    // Process each provider
    for (const providerKey of providersToUpdate) {
      const scraper = SCRAPERS[providerKey];
      if (!scraper) {
        console.log(`⚠️ No scraper configured for: ${providerKey}`);
        continue;
      }
      
      console.log(`Processing ${scraper.name}...`);
      
      let scrapedModels = [];
      let lastError = null;
      
      // Try each URL for the provider
      for (const url of scraper.urls) {
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        
        try {
          console.log(`  Trying URL: ${url}`);
          
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          // Run the scraper
          scrapedModels = await scraper.scrape(page);
          
          if (scrapedModels && scrapedModels.length > 0) {
            console.log(`  ✅ Found ${scrapedModels.length} models`);
            results.success.push({
              provider: scraper.name,
              models: scrapedModels.length,
              url: url
            });
            break; // Success, no need to try other URLs
          }
          
        } catch (error) {
          lastError = error;
          console.log(`  ❌ Failed: ${error.message}`);
        } finally {
          await context.close();
        }
      }
      
      // Update existing data if we found models
      if (scrapedModels && scrapedModels.length > 0) {
        const provider = existingData.providers.find(p => p.name === scraper.name);
        
        if (provider) {
          let updatedCount = 0;
          
          scrapedModels.forEach(scrapedModel => {
            // Find matching model in existing data
            const existingModel = provider.models.find(m => {
              const nameMatch = m.name.toLowerCase().includes(scrapedModel.name.toLowerCase()) ||
                               scrapedModel.name.toLowerCase().includes(m.name.toLowerCase()) ||
                               m.modelId.toLowerCase().includes(scrapedModel.name.toLowerCase());
              return nameMatch;
            });
            
            if (existingModel && scrapedModel.inputPrice !== null) {
              // Check if prices changed
              const oldInput = existingModel.pricing.input;
              const oldOutput = existingModel.pricing.output;
              
              if (oldInput !== scrapedModel.inputPrice || oldOutput !== scrapedModel.outputPrice) {
                results.changes.push({
                  provider: scraper.name,
                  model: existingModel.name,
                  oldPrices: { input: oldInput, output: oldOutput },
                  newPrices: { input: scrapedModel.inputPrice, output: scrapedModel.outputPrice }
                });
                
                existingModel.pricing.input = scrapedModel.inputPrice;
                existingModel.pricing.output = scrapedModel.outputPrice || scrapedModel.inputPrice * 4;
                updatedCount++;
              }
            }
          });
          
          if (updatedCount > 0) {
            console.log(`  📝 Updated ${updatedCount} model prices`);
          }
        }
      } else {
        results.failed.push({
          provider: scraper.name,
          error: lastError?.message || 'No models found'
        });
      }
      
      console.log('');
    }
    
    // Update timestamp
    existingData.lastUpdated = new Date().toISOString();
    
    // Save updated data
    await fs.writeFile(dataPath, JSON.stringify(existingData, null, 2));
    
    // Generate report
    const report = {
      timestamp: existingData.lastUpdated,
      duration: Date.now() - startTime,
      totalProviders: results.success.length,
      totalModels: results.success.reduce((sum, p) => sum + p.models, 0),
      providers: results.success,
      changes: results.changes,
      errors: results.failed
    };
    
    // Save report
    const reportPath = path.join(__dirname, '..', 'test-results', 'scraping-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('=' .repeat(60));
    console.log('UPDATE SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Duration: ${(report.duration / 1000).toFixed(2)} seconds`);
    console.log(`Providers updated: ${report.totalProviders}`);
    console.log(`Total models found: ${report.totalModels}`);
    console.log(`Price changes: ${report.changes.length}`);
    
    if (report.changes.length > 0) {
      console.log('\nPrice changes detected:');
      report.changes.forEach(change => {
        console.log(`  ${change.provider} - ${change.model}:`);
        console.log(`    Input: $${change.oldPrices.input} → $${change.newPrices.input}`);
        console.log(`    Output: $${change.oldPrices.output} → $${change.newPrices.output}`);
      });
    }
    
    if (report.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      report.errors.forEach(err => {
        console.log(`  ${err.provider}: ${err.error}`);
      });
    }
    
    console.log('\n✅ Pricing data updated successfully');
    
    // Exit with appropriate code
    process.exit(report.errors.length === providersToUpdate.length ? 1 : 0);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  updatePricingData().catch(error => {
    console.error('Update failed:', error);
    process.exit(1);
  });
}

module.exports = { updatePricingData };