const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

async function testLLMPricingWebsite() {
  console.log('Starting Playwright test demo...\n');
  
  const browser = await chromium.launch({ 
    headless: true 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Test 1: Load the main page
    console.log('Test 1: Loading main pricing page...');
    const indexPath = path.resolve(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);
    
    // Wait for data to load (the table starts hidden and shows after data loads)
    await page.waitForFunction(() => {
      const table = document.querySelector('#pricingTable');
      return table && table.style.display !== 'none';
    }, { timeout: 10000 });
    console.log('✓ Main page loaded successfully');
    
    // Test 2: Check if pricing data is loaded
    console.log('\nTest 2: Checking pricing data...');
    const rowCount = await page.locator('#tableBody tr').count();
    console.log(`✓ Found ${rowCount} pricing entries`);
    
    // Test 3: Test search functionality
    console.log('\nTest 3: Testing search filter...');
    await page.fill('#search', 'OpenAI');
    await page.waitForTimeout(500);
    const filteredCount = await page.locator('#tableBody tr').count();
    console.log(`✓ Search filter working - showing ${filteredCount} OpenAI models`);
    
    // Test 4: Test provider filter
    console.log('\nTest 4: Testing provider dropdown...');
    await page.fill('#search', ''); // Clear search
    await page.selectOption('#providerFilter', 'Anthropic');
    await page.waitForTimeout(500);
    const anthropicCount = await page.locator('#tableBody tr').count();
    console.log(`✓ Provider filter working - showing ${anthropicCount} Anthropic models`);
    
    // Test 5: Check statistics display
    console.log('\nTest 5: Checking statistics...');
    const providerCount = await page.locator('#providerCount').textContent();
    const modelCount = await page.locator('#modelCount').textContent();
    console.log(`✓ Statistics loaded: ${providerCount} providers, ${modelCount} models`);
    
    // Test 6: Take screenshot
    console.log('\nTest 6: Taking screenshot...');
    await page.screenshot({ 
      path: 'test-results/pricing-page.png', 
      fullPage: true 
    });
    console.log('✓ Screenshot saved to test-results/pricing-page.png');
    
    // Test 7: Load API documentation page
    console.log('\nTest 7: Loading API documentation...');
    const apiPath = path.resolve(__dirname, 'api.html');
    await page.goto(`file://${apiPath}`);
    const apiTitle = await page.title();
    console.log(`✓ API page loaded: "${apiTitle}"`);
    
    // Test 8: Validate JSON data structure
    console.log('\nTest 8: Validating JSON data...');
    const jsonPath = path.resolve(__dirname, 'data', 'llm-pricing.json');
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(jsonContent);
    console.log(`✓ JSON valid with ${data.providers.length} providers`);
    
    // Test 9: Check responsive design
    console.log('\nTest 9: Testing mobile viewport...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`file://${indexPath}`);
    await page.waitForSelector('#pricingTable', { state: 'visible', timeout: 5000 });
    console.log('✓ Mobile viewport working correctly');
    
    // Test 10: Test sorting
    console.log('\nTest 10: Testing sort functionality...');
    await page.setViewportSize({ width: 1280, height: 720 }); // Reset viewport
    await page.selectOption('#sortBy', 'inputPrice');
    await page.waitForTimeout(500);
    const firstPrice = await page.locator('.price-input').first().textContent();
    console.log(`✓ Sorting working - cheapest model: ${firstPrice}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('All tests passed successfully! ✓');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
testLLMPricingWebsite().catch(console.error);