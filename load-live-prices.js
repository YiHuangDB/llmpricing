const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Price scraping configurations for each provider
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    url: 'https://openai.com/api/pricing/',
    scraper: async (page) => {
      console.log('  Extracting OpenAI pricing...');
      
      await page.waitForSelector('h2', { timeout: 10000 });
      
      const prices = await page.evaluate(() => {
        const models = [];
        
        // Look for all heading elements that might contain model names
        const headings = document.querySelectorAll('h2, h3');
        
        headings.forEach(heading => {
          const modelName = heading.textContent.trim();
          
          // Check if this is a model heading (contains GPT, o1, o3, etc.)
          if (modelName.match(/GPT|o\d+/)) {
            const section = heading.closest('div');
            if (!section) return;
            
            // Look for pricing information in the section
            const priceTexts = Array.from(section.querySelectorAll('div')).map(el => el.textContent);
            
            let inputPrice = null;
            let outputPrice = null;
            
            priceTexts.forEach(text => {
              // Match input price
              const inputMatch = text.match(/Input:.*?\$?([\d.]+)/);
              if (inputMatch) inputPrice = parseFloat(inputMatch[1]);
              
              // Match output price
              const outputMatch = text.match(/Output:.*?\$?([\d.]+)/);
              if (outputMatch) outputPrice = parseFloat(outputMatch[1]);
            });
            
            if (inputPrice !== null || outputPrice !== null) {
              models.push({
                name: modelName,
                inputPrice,
                outputPrice,
                source: 'web-scrape'
              });
            }
          }
        });
        
        return models;
      });
      
      return prices;
    }
  },
  
  anthropic: {
    name: 'Anthropic',
    url: 'https://www.anthropic.com/pricing',
    scraper: async (page) => {
      console.log('  Extracting Anthropic pricing...');
      
      await page.waitForTimeout(3000); // Wait for dynamic content
      
      const prices = await page.evaluate(() => {
        const models = [];
        const elements = document.querySelectorAll('*');
        
        // Look for Claude pricing patterns
        const pricePatterns = [];
        elements.forEach(el => {
          const text = el.textContent || '';
          if (text.includes('Claude') && text.includes('$') && !text.includes('script')) {
            const cleanText = text.replace(/\s+/g, ' ').trim();
            if (cleanText.length < 500) { // Avoid large text blocks
              pricePatterns.push(cleanText);
            }
          }
        });
        
        // Extract unique Claude models
        const seen = new Set();
        pricePatterns.forEach(text => {
          // Match patterns like "Claude 3.5 Sonnet: $3/$15"
          const match = text.match(/Claude\s+([\d.]+\s+\w+)[:\s]*\$?([\d.]+).*?\$?([\d.]+)/);
          if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            models.push({
              name: `Claude ${match[1]}`,
              inputPrice: parseFloat(match[2]),
              outputPrice: parseFloat(match[3]),
              source: 'web-scrape'
            });
          }
        });
        
        return models;
      });
      
      return prices;
    }
  },
  
  google: {
    name: 'Google AI',
    url: 'https://ai.google.dev/pricing',
    scraper: async (page) => {
      console.log('  Extracting Google AI pricing...');
      
      await page.waitForTimeout(3000);
      
      const prices = await page.evaluate(() => {
        const models = [];
        
        // Look for Gemini models
        const elements = document.querySelectorAll('*');
        const geminiPrices = [];
        
        elements.forEach(el => {
          const text = el.textContent || '';
          if (text.includes('Gemini') && text.includes('$')) {
            const cleanText = text.replace(/\s+/g, ' ').trim();
            if (cleanText.length < 300) {
              geminiPrices.push(cleanText);
            }
          }
        });
        
        // Parse Gemini pricing
        const seen = new Set();
        geminiPrices.forEach(text => {
          const match = text.match(/Gemini\s+([\d.]+\s+\w+).*?\$?([\d.]+)/);
          if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            const price = parseFloat(match[2]);
            models.push({
              name: `Gemini ${match[1]}`,
              inputPrice: price,
              outputPrice: price * 4, // Estimate output as 4x input
              source: 'web-scrape'
            });
          }
        });
        
        return models;
      });
      
      return prices;
    }
  }
};

async function loadLivePrices() {
  console.log('='.repeat(60));
  console.log('LOADING LIVE LLM PRICING DATA');
  console.log('='.repeat(60));
  console.log();
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const allPrices = {};
  const errors = [];
  
  try {
    // Load existing JSON data
    const jsonPath = path.join(__dirname, 'data', 'llm-pricing.json');
    const existingData = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    
    console.log(`📊 Current data: ${existingData.providers.length} providers\n`);
    
    // Scrape each provider
    for (const [key, config] of Object.entries(PROVIDERS)) {
      console.log(`🔍 Fetching ${config.name} prices...`);
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      const page = await context.newPage();
      
      try {
        await page.goto(config.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        const prices = await config.scraper(page);
        
        if (prices && prices.length > 0) {
          allPrices[key] = prices;
          console.log(`  ✅ Found ${prices.length} models\n`);
          
          // Update existing data
          const provider = existingData.providers.find(p => p.name === config.name);
          if (provider) {
            prices.forEach(scrapedModel => {
              const existingModel = provider.models.find(m => 
                m.name.toLowerCase().includes(scrapedModel.name.toLowerCase()) ||
                scrapedModel.name.toLowerCase().includes(m.name.toLowerCase())
              );
              
              if (existingModel && scrapedModel.inputPrice) {
                console.log(`  📝 Updating ${existingModel.name}:`);
                console.log(`     Input: $${existingModel.pricing.input} → $${scrapedModel.inputPrice}`);
                console.log(`     Output: $${existingModel.pricing.output} → $${scrapedModel.outputPrice}`);
                
                existingModel.pricing.input = scrapedModel.inputPrice;
                existingModel.pricing.output = scrapedModel.outputPrice;
              }
            });
          }
        } else {
          console.log(`  ⚠️ No prices found\n`);
          errors.push(`${config.name}: No prices found`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}\n`);
        errors.push(`${config.name}: ${error.message}`);
      } finally {
        await context.close();
      }
    }
    
    // Update timestamp
    existingData.lastUpdated = new Date().toISOString();
    
    // Save updated data
    await fs.writeFile(jsonPath, JSON.stringify(existingData, null, 2));
    
    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log();
    
    // Display summary
    let totalModels = 0;
    Object.entries(allPrices).forEach(([provider, models]) => {
      console.log(`${provider}: ${models.length} models`);
      totalModels += models.length;
      models.slice(0, 3).forEach(model => {
        console.log(`  - ${model.name}: $${model.inputPrice}/$${model.outputPrice}`);
      });
      if (models.length > 3) console.log(`  ... and ${models.length - 3} more`);
      console.log();
    });
    
    console.log(`✅ Successfully scraped ${totalModels} models from ${Object.keys(allPrices).length} providers`);
    
    if (errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('\n📁 Data saved to data/llm-pricing.json');
    
    // Also save a scraping report
    const report = {
      timestamp: new Date().toISOString(),
      totalProviders: Object.keys(allPrices).length,
      totalModels: totalModels,
      providers: allPrices,
      errors: errors
    };
    
    await fs.writeFile(
      path.join(__dirname, 'test-results', 'scraping-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('📄 Scraping report saved to test-results/scraping-report.json');
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Alternative: Use MCP Playwright tools to load prices
async function loadPricesWithMCP() {
  console.log('\n' + '='.repeat(60));
  console.log('USING MCP PLAYWRIGHT TOOLS FOR PRICE LOADING');
  console.log('='.repeat(60));
  console.log();
  
  console.log('The MCP Playwright tools provide these functions:');
  console.log('1. mcp__playwright-local__browser_navigate - Navigate to pricing pages');
  console.log('2. mcp__playwright-local__browser_snapshot - Get page structure');
  console.log('3. mcp__playwright-local__browser_evaluate - Extract pricing data');
  console.log('4. mcp__playwright-local__browser_take_screenshot - Document findings');
  console.log();
  console.log('These tools can be used to automate price collection from any website.');
}

// Run the price loader
if (require.main === module) {
  console.log('Starting live price loading...\n');
  
  loadLivePrices()
    .then(() => loadPricesWithMCP())
    .catch(console.error);
}

module.exports = { loadLivePrices };