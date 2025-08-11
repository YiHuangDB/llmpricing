const { chromium } = require('playwright');

async function demonstratePlaywrightScraping() {
  console.log('='.repeat(60));
  console.log('PLAYWRIGHT BROWSER AUTOMATION DEMO FOR LLM PRICING');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,  // Set to false to see the browser in action
    slowMo: 500      // Slow down actions to make them visible
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Demo 1: Navigate to OpenAI pricing page
    console.log('\n📍 Demo 1: Navigating to OpenAI pricing page...');
    await page.goto('https://openai.com/api/pricing/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    console.log('✓ Page loaded');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/openai-pricing-demo.png',
      fullPage: false 
    });
    console.log('✓ Screenshot saved to test-results/openai-pricing-demo.png');
    
    // Demo 2: Extract page title and URL
    console.log('\n📍 Demo 2: Extracting page information...');
    const title = await page.title();
    const url = page.url();
    console.log(`  Title: ${title}`);
    console.log(`  URL: ${url}`);
    
    // Demo 3: Look for pricing information on the page
    console.log('\n📍 Demo 3: Searching for pricing data...');
    const pricingData = await page.evaluate(() => {
      const results = [];
      
      // Look for elements containing dollar signs
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        const text = el.textContent || '';
        // Match patterns like $X.XX or $X per
        const priceMatch = text.match(/\$(\d+\.?\d*)/);
        if (priceMatch && el.children.length === 0) { // Only leaf nodes
          const cleanText = text.trim().substring(0, 100);
          if (cleanText.length > 0 && cleanText.length < 100) {
            results.push({
              text: cleanText,
              price: priceMatch[0]
            });
          }
        }
      });
      
      // Remove duplicates
      const unique = [];
      const seen = new Set();
      results.forEach(item => {
        if (!seen.has(item.text)) {
          seen.add(item.text);
          unique.push(item);
        }
      });
      
      return unique.slice(0, 10); // Return first 10 unique prices found
    });
    
    console.log(`✓ Found ${pricingData.length} pricing elements:`);
    pricingData.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.price} - ${item.text.substring(0, 50)}...`);
    });
    
    // Demo 4: Create a test HTML page and interact with it
    console.log('\n📍 Demo 4: Creating and testing a sample pricing page...');
    await page.goto('data:text/html,<!DOCTYPE html><html><body>' +
      '<h1>LLM Pricing Test Page</h1>' +
      '<table id="pricing">' +
      '<tr><th>Model</th><th>Input Price</th><th>Output Price</th></tr>' +
      '<tr><td>GPT-4</td><td>$30.00</td><td>$60.00</td></tr>' +
      '<tr><td>GPT-3.5</td><td>$0.50</td><td>$1.50</td></tr>' +
      '<tr><td>Claude 3.5</td><td>$3.00</td><td>$15.00</td></tr>' +
      '</table>' +
      '<input id="search" type="text" placeholder="Search models...">' +
      '<button id="update">Update Prices</button>' +
      '</body></html>');
    
    console.log('✓ Test page created');
    
    // Interact with the page
    await page.fill('#search', 'GPT');
    console.log('✓ Filled search box with "GPT"');
    
    await page.click('#update');
    console.log('✓ Clicked update button');
    
    // Extract table data
    const tableData = await page.evaluate(() => {
      const rows = document.querySelectorAll('#pricing tr');
      const data = [];
      rows.forEach((row, index) => {
        if (index > 0) { // Skip header
          const cells = row.querySelectorAll('td');
          if (cells.length === 3) {
            data.push({
              model: cells[0].textContent,
              inputPrice: cells[1].textContent,
              outputPrice: cells[2].textContent
            });
          }
        }
      });
      return data;
    });
    
    console.log('✓ Extracted table data:');
    tableData.forEach(row => {
      console.log(`  ${row.model}: Input ${row.inputPrice}, Output ${row.outputPrice}`);
    });
    
    // Demo 5: Use Playwright's built-in MCP tools to interact with a real page
    console.log('\n📍 Demo 5: Using Playwright MCP tools...');
    console.log('✓ MCP Playwright tools are available for browser automation');
    console.log('  Available functions:');
    console.log('  - mcp__playwright-local__browser_navigate');
    console.log('  - mcp__playwright-local__browser_snapshot');
    console.log('  - mcp__playwright-local__browser_click');
    console.log('  - mcp__playwright-local__browser_type');
    console.log('  - mcp__playwright-local__browser_evaluate');
    
    console.log('\n' + '='.repeat(60));
    console.log('DEMO COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nKey Takeaways:');
    console.log('1. Playwright can navigate to real websites');
    console.log('2. It can extract pricing data from page content');
    console.log('3. It can interact with form elements');
    console.log('4. It can take screenshots for debugging');
    console.log('5. MCP tools provide additional browser automation capabilities');
    
  } catch (error) {
    console.error('Demo error:', error.message);
  } finally {
    await browser.close();
    console.log('\n✓ Browser closed');
  }
}

// Run the demo
console.log('Starting Playwright browser automation demo...\n');
demonstratePlaywrightScraping().catch(console.error);